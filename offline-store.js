/* Armazenamento local e fila de sincronização. Os dados financeiros ficam em IndexedDB
   por usuário; somente operações pendentes são enviadas ao Supabase autenticado. */
(() => {
  "use strict";
  const DB_NAME = "meu-financeiro-offline";
  const DB_VERSION = 1;
  const STORE = "profiles";
  const TABLES = ["transactions", "cards", "installments", "bills", "goals"];
  const locks = new Map();
  let dbPromise;

  const emptyRows = () => ({ transactions: [], cards: [], installments: [], bills: [], goals: [] });
  const deepClone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const online = () => typeof navigator === "undefined" || navigator.onLine !== false;
  const now = () => new Date().toISOString();

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }

  function emit(userId, state, extra = {}) {
    try {
      window.dispatchEvent(new CustomEvent("finance-sync-state", {
        detail: {
          userId,
          online: online(),
          pendingCount: state && Array.isArray(state.queue) ? state.queue.length : 0,
          lastError: state && state.lastError ? state.lastError : null,
          ...extra
        }
      }));
    } catch (_) {}
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("Este dispositivo não oferece armazenamento offline compatível."));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "userId" });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error("Não foi possível abrir o armazenamento local."));
      request.onblocked = () => reject(new Error("Feche outras abas antigas do Meu Financeiro e tente novamente."));
    });
    return dbPromise;
  }

  async function readState(userId) {
    if (!userId) throw new Error("Não foi possível identificar a conta para abrir os dados locais.");
    const db = await openDb();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(userId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Não foi possível ler os dados locais."));
    });
    if (value) {
      value.rows = value.rows || emptyRows();
      for (const table of TABLES) if (!Array.isArray(value.rows[table])) value.rows[table] = [];
      value.queue = Array.isArray(value.queue) ? value.queue : [];
      return value;
    }
    return { userId, rows: emptyRows(), queue: [], updatedAt: now(), lastError: null, lastSyncAt: null };
  }

  async function writeState(state) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(state);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Não foi possível salvar no dispositivo."));
      tx.onabort = () => reject(tx.error || new Error("O salvamento local foi interrompido."));
    });
    emit(state.userId, state);
  }

  function serialize(userId, task) {
    const prior = locks.get(userId) || Promise.resolve();
    const next = prior.catch(() => {}).then(task);
    const tracked = next.finally(() => {
      if (locks.get(userId) === tracked) locks.delete(userId);
    });
    locks.set(userId, tracked);
    return tracked;
  }

  function rowKey(table, id) { return table + ":" + id; }

  function rememberedUser() {
    try {
      const value = JSON.parse(localStorage.getItem("mf-offline-user-v1") || "null");
      return value && value.id ? value : null;
    } catch (_) { return null; }
  }
  function rememberUser(user) {
    if (!user || !user.id) return;
    try { localStorage.setItem("mf-offline-user-v1", JSON.stringify({ id: user.id, email: user.email || "" })); } catch (_) {}
  }
  function clearRememberedUser() {
    try { localStorage.removeItem("mf-offline-user-v1"); } catch (_) {}
  }

  async function getRows(userId) {
    const state = await readState(userId);
    return deepClone(state.rows);
  }

  async function getStatus(userId) {
    try {
      const state = await readState(userId);
      return {
        online: online(),
        pendingCount: state.queue.length,
        lastError: state.lastError || null,
        lastSyncAt: state.lastSyncAt || null
      };
    } catch (error) {
      return { online: online(), pendingCount: 0, lastError: error.message || "Armazenamento local indisponível.", lastSyncAt: null };
    }
  }

  async function enqueueUpsert(userId, table, row, isCreate) {
    if (!TABLES.includes(table)) throw new Error("Tipo de registro não suportado.");
    return serialize(userId, async () => {
      const state = await readState(userId);
      const index = state.rows[table].findIndex(item => item.id === row.id);
      const oldRow = index >= 0 ? state.rows[table][index] : null;
      const safeRow = {
        ...(oldRow || {}),
        ...deepClone(row),
        id: row.id || uuid(),
        user_id: userId,
        created_at: row.created_at || (oldRow && oldRow.created_at) || now(),
        updated_at: now()
      };
      const previous = state.queue.find(op => op.table === table && op.rowId === safeRow.id);
      state.queue = state.queue.filter(op => !(op.table === table && op.rowId === safeRow.id));
      state.queue.push({
        opId: uuid(),
        table,
        rowId: safeRow.id,
        action: "upsert",
        isCreate: previous ? previous.isCreate : Boolean(isCreate),
        payload: safeRow,
        createdAt: now()
      });
      if (index >= 0) state.rows[table][index] = safeRow;
      else state.rows[table].push(safeRow);
      state.updatedAt = now();
      state.lastError = null;
      await writeState(state);
      return safeRow;
    });
  }

  async function enqueueDelete(userId, table, rowId) {
    if (!TABLES.includes(table)) throw new Error("Tipo de registro não suportado.");
    return serialize(userId, async () => {
      const state = await readState(userId);
      const prior = state.queue.find(op => op.table === table && op.rowId === rowId);
      state.queue = state.queue.filter(op => !(op.table === table && op.rowId === rowId));
      if (!prior || !prior.isCreate) {
        state.queue.push({ opId: uuid(), table, rowId, action: "delete", isCreate: false, payload: null, createdAt: now() });
      }
      state.rows[table] = state.rows[table].filter(row => row.id !== rowId);
      // If a goal/card has child rows, let the database's existing relationship rules handle them.
      state.updatedAt = now();
      state.lastError = null;
      await writeState(state);
      return { removed: true };
    });
  }

  function serverPayload(payload) {
    const row = { ...payload };
    delete row.__pending;
    delete row.localOnly;
    return row;
  }

  async function flushQueue(userId, client) {
    return serialize(userId, async () => {
      const state = await readState(userId);
      if (!online()) {
        emit(userId, state, { mode: "offline" });
        return { synced: 0, pendingCount: state.queue.length, offline: true, error: null };
      }
      if (!client) return { synced: 0, pendingCount: state.queue.length, offline: false, error: "Entre na sua conta quando houver internet para sincronizar." };
      let synced = 0;
      for (const op of [...state.queue]) {
        let result;
        try {
          if (op.action === "delete") {
            result = await client.from(op.table).delete().eq("id", op.rowId);
          } else {
            result = await client.from(op.table).upsert(serverPayload(op.payload), { onConflict: "id" });
          }
        } catch (error) {
          state.lastError = error.message || "Falha de conexão durante a sincronização.";
          break;
        }
        if (result && result.error) {
          state.lastError = result.error.message || "Não foi possível sincronizar.";
          break;
        }
        state.queue = state.queue.filter(item => item.opId !== op.opId);
        synced += 1;
      }
      state.lastSyncAt = synced ? now() : state.lastSyncAt;
      if (state.queue.length === 0) state.lastError = null;
      state.updatedAt = now();
      await writeState(state);
      return { synced, pendingCount: state.queue.length, offline: false, error: state.lastError };
    });
  }

  async function pullRemote(userId, client) {
    return serialize(userId, async () => {
      if (!client || !online()) return { rows: (await readState(userId)).rows, pulled: 0, error: null };
      const state = await readState(userId);
      let pulled = 0;
      for (const table of TABLES) {
        let query;
        try {
          query = await client.from(table).select("*");
        } catch (error) {
          state.lastError = error.message || "Falha ao consultar a nuvem.";
          continue;
        }
        if (query.error || !Array.isArray(query.data)) {
          state.lastError = query.error ? query.error.message : "Resposta inesperada da nuvem.";
          continue;
        }
        const pendingKeys = new Set(state.queue.filter(op => op.table === table).map(op => op.rowId));
        const remote = query.data;
        const remoteIds = new Set(remote.map(row => row.id));
        let local = state.rows[table].filter(row => pendingKeys.has(row.id) || remoteIds.has(row.id));
        const localById = new Map(local.map((row, index) => [row.id, index]));
        for (const row of remote) {
          if (pendingKeys.has(row.id)) continue;
          const existing = localById.get(row.id);
          if (existing === undefined) {
            localById.set(row.id, local.length);
            local.push(row);
          } else local[existing] = row;
          pulled += 1;
        }
        // Keep optimistic local records whose operations are still waiting to sync.
        for (const op of state.queue.filter(op => op.table === table && op.action === "upsert")) {
          if (!local.some(row => row.id === op.rowId)) local.push(op.payload);
        }
        state.rows[table] = local;
      }
      state.updatedAt = now();
      await writeState(state);
      return { rows: deepClone(state.rows), pulled, error: state.lastError || null };
    });
  }

  async function load(userId, client, allowSync = true) {
    let state = await readState(userId);
    if (allowSync && online() && client) {
      const flushed = await flushQueue(userId, client);
      state = await readState(userId);
      // A failed write stays queued; pullRemote won't overwrite any affected local record.
      const pulled = await pullRemote(userId, client);
      state = await readState(userId);
      return { rows: deepClone(state.rows), pendingCount: state.queue.length, synced: flushed.synced, error: flushed.error || pulled.error || null };
    }
    return { rows: deepClone(state.rows), pendingCount: state.queue.length, synced: 0, error: null };
  }

  async function save(userId, client, table, row, isCreate, allowSync = true) {
    const stored = await enqueueUpsert(userId, table, row, isCreate);
    let result = { synced: 0, pendingCount: (await getStatus(userId)).pendingCount, offline: !online(), error: null };
    if (allowSync && online() && client) {
      // The local write is already durable; sync in the background so the interface is responsive.
      flushQueue(userId, client).then(r => emit(userId, null, r)).catch(error => emit(userId, null, { error: error.message }));
    }
    return { row: stored, ...result };
  }

  async function remove(userId, client, table, rowId, allowSync = true) {
    await enqueueDelete(userId, table, rowId);
    const status = await getStatus(userId);
    if (allowSync && online() && client) {
      flushQueue(userId, client).then(r => emit(userId, null, r)).catch(error => emit(userId, null, { error: error.message }));
    }
    return { ...status, removed: true };
  }

  async function update(userId, client, table, rowId, patch, allowSync = true) {
    const state = await readState(userId);
    const current = (state.rows[table] || []).find(row => row.id === rowId);
    if (!current) throw new Error("Não encontrei esse registro salvo neste dispositivo.");
    return save(userId, client, table, { ...current, ...patch, id: rowId, user_id: userId }, false, allowSync);
  }

  async function sync(userId, client) {
    const flushed = await flushQueue(userId, client);
    if (!flushed.offline && client && online()) {
      const pulled = await pullRemote(userId, client);
      const state = await readState(userId);
      return { ...flushed, pulled: pulled.pulled || 0, rows: deepClone(state.rows), error: flushed.error || pulled.error || null };
    }
    const state = await readState(userId);
    return { ...flushed, rows: deepClone(state.rows) };
  }

  window.FinanceOffline = {
    tables: TABLES,
    getRows,
    getStatus,
    load,
    save,
    remove,
    update,
    sync,
    rememberUser,
    rememberedUser,
    clearRememberedUser,
    online
  };
})();