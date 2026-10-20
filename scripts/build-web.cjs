const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "www");
const files = [
  "index.html", "style.css", "app.js", "offline-store.js", "config.js",
  "pwa.js", "sw.js", "manifest.webmanifest", "favicon.svg",
  "app-icon.svg", "app-icon-maskable.svg", "icon-192.png", "icon-512.png"
];

async function main() {
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  for (const file of files) {
    try {
      await fs.copyFile(path.join(root, file), path.join(out, file));
    } catch (error) {
      throw new Error("Não foi possível copiar " + file + ": " + error.message);
    }
  }
  const packageSdk = path.join(root, "node_modules", "@supabase", "supabase-js", "dist", "umd", "supabase.js");
  try {
    await fs.copyFile(packageSdk, path.join(out, "supabase.min.js"));
  } catch (error) {
    throw new Error("Bundle local do Supabase não encontrado em " + packageSdk + ". " + error.message);
  }
  const indexPath = path.join(out, "index.html");
  let html = await fs.readFile(indexPath, "utf8");
  html = html.replace('<meta name="apple-mobile-web-app-title" content="Meu Financeiro">', '<meta name="apple-mobile-web-app-title" content="Meu Financeiro">\n<meta name="mf-native-shell" content="true">');
  const remoteSdk = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
  if (html.includes(remoteSdk)) html = html.replace(remoteSdk, '<script src="supabase.min.js"></script>');
  if (!html.includes('src="supabase.min.js"')) throw new Error("Referência ao SDK Supabase não localizada.");
  await fs.writeFile(indexPath, html, "utf8");
  console.log("Bundle local criado em www/.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
