const { app, BrowserWindow, protocol, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

protocol.registerSchemesAsPrivileged([{
  scheme: "financeapp",
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
    allowServiceWorkers: false
  }
}]);

const root = path.resolve(__dirname, "..", "www");
const mimeTypes = {
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".webmanifest":"application/manifest+json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".ico":"image/x-icon",
  ".woff":"font/woff",
  ".woff2":"font/woff2"
};

async function serveLocalAssets(request) {
  const url = new URL(request.url);
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch (_) { return new Response("Invalid path", { status: 400 }); }
  if (!pathname || pathname === "/") pathname = "/index.html";
  const target = path.resolve(root, "." + pathname);
  if (target !== root && !target.startsWith(root + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    const body = await fs.readFile(target);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": mimeTypes[path.extname(target).toLowerCase()] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store"
      }
    });
  } catch (_) {
    return new Response("Not found", { status: 404 });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 360,
    minHeight: 600,
    title: "Meu Financeiro",
    icon: path.resolve(__dirname, "..", "app-icon.ico"),
    autoHideMenuBar: true,
    backgroundColor: "#f8f6ef",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("mailto:")) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("financeapp://localhost/")) {
      event.preventDefault();
      if (url.startsWith("https://") || url.startsWith("mailto:")) shell.openExternal(url);
    }
  });
  win.loadURL("financeapp://localhost/index.html");
}

app.whenReady().then(() => {
  protocol.handle("financeapp", serveLocalAssets);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
