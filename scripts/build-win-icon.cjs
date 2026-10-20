const fs = require("node:fs/promises");
const path = require("node:path");
const pngToIco = require("png-to-ico");
(async () => {
  const root = path.resolve(__dirname, "..");
  const result = await pngToIco(path.join(root, "icon-512.png"));
  await fs.writeFile(path.join(root, "app-icon.ico"), result);
  console.log("Ícone Windows criado.");
})().catch(error => { console.error(error); process.exitCode = 1; });
