const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const res = path.join(root, "android", "app", "src", "main", "res");
const source = path.join(root, "app-icon.svg");
const sizes = { mdpi:48, hdpi:72, xhdpi:96, xxhdpi:144, xxxhdpi:192 };

// O foreground usa o mesmo desenho do favicon, em escala segura para ícones adaptativos Android.
const foregroundSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432">' +
  '<path d="M227 154 L263 123 L294 144 L331 102" fill="none" stroke="#bcebd2" stroke-width="18.2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<circle cx="331" cy="102" r="15.6" fill="#fffefa"/>' +
  '<text x="92" y="310" font-family="Arial,sans-serif" font-size="203" font-weight="700" letter-spacing="-10.4" fill="#fffefa">m.</text>' +
  '</svg>'
);

async function main() {
  for (const [density, size] of Object.entries(sizes)) {
    const folder = path.join(res, "mipmap-" + density);
    await fs.mkdir(folder, { recursive: true });
    await sharp(source).resize(size, size).png().toFile(path.join(folder, "ic_launcher.png"));
    await sharp(source).resize(size, size).png().toFile(path.join(folder, "ic_launcher_round.png"));
  }
  const highDensity = path.join(res, "mipmap-xxxhdpi");
  await sharp(foregroundSvg).png().toFile(path.join(highDensity, "ic_launcher_foreground.png"));
  const values = path.join(res, "values");
  await fs.mkdir(values, { recursive: true });
  // Capacitor já cria o recurso de fundo; sobrescreve o arquivo existente em vez de duplicar.
  const backgroundPath = path.join(values, "ic_launcher_background.xml");
  const backgroundXml = '<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#328266</color></resources>\n';
  await fs.writeFile(backgroundPath, backgroundXml, "utf8");

  const adaptiveFolder = path.join(res, "mipmap-anydpi-v26");
  await fs.mkdir(adaptiveFolder, { recursive: true });
  const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">' +
    '<background android:drawable="@color/ic_launcher_background"/>' +
    '<foreground android:drawable="@mipmap/ic_launcher_foreground"/>' +
    '</adaptive-icon>\n';
  await fs.writeFile(path.join(adaptiveFolder, "ic_launcher.xml"), adaptive, "utf8");
  await fs.writeFile(path.join(adaptiveFolder, "ic_launcher_round.xml"), adaptive, "utf8");
  console.log("Ícone do site aplicado ao projeto Android.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
