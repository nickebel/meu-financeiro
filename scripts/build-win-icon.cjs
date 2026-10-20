const fs = require("node:fs/promises");
const path = require("node:path");
const pngToIco = require("png-to-ico");
const sharp = require("sharp");

(async () => {
  const root = path.resolve(__dirname, "..");
  const svg = await fs.readFile(path.join(root, "app-icon.svg"));
  const temporaryPng = path.join(root, ".app-icon-build.png");
  try {
    await sharp(svg).resize(512, 512).png().toFile(temporaryPng);
    const ico = await pngToIco(temporaryPng);
    await fs.writeFile(path.join(root, "app-icon.ico"), ico);
    console.log("Ícone Windows criado a partir do SVG da marca.");
  } finally {
    await fs.rm(temporaryPng, { force: true });
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
