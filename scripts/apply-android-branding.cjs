const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const res = path.join(root, "android", "app", "src", "main", "res");
const source = path.join(root, "app-icon.svg");
const sizes = { mdpi:48, hdpi:72, xhdpi:96, xxhdpi:144, xxxhdpi:192 };

const foregroundSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 512 512">' +
  '<path d="M292 166 L335 130 L372 155 L420 101" fill="none" stroke="#bcebd2" stroke-width="21" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<circle cx="420" cy="101" r="17" fill="#fffefa"/>' +
  '<path d="M78 365 V251 C78 222 95 205 122 205 C149 205 166 222 166 251 V365 M166 251 C166 222 183 205 210 205 C237 205 254 222 254 251 V365" fill="none" stroke="#fffefa" stroke-width="35" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<circle cx="311" cy="345" r="19" fill="#fffefa"/>' +
  '</svg>'
);

async function main() {
  for (const [density, size] of Object.entries(sizes)) {
    const folder = path.join(res, "mipmap-" + density);
    await fs.mkdir(folder, { recursive: true });
    await sharp(source).resize(size, size).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(path.join(folder, "ic_launcher.png"));
    await sharp(source).resize(size, size).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(path.join(folder, "ic_launcher_round.png"));
    await sharp(foregroundSvg).resize(size, size).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(path.join(folder, "ic_launcher_foreground.png"));
  }

  const values = path.join(res, "values");
  await fs.mkdir(values, { recursive: true });
  await fs.writeFile(path.join(values, "ic_launcher_background.xml"),
    '<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#328266</color></resources>\n', "utf8");

  const adaptiveFolder = path.join(res, "mipmap-anydpi-v26");
  await fs.mkdir(adaptiveFolder, { recursive: true });
  const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>\n';
  await fs.writeFile(path.join(adaptiveFolder, "ic_launcher.xml"), adaptive, "utf8");
  await fs.writeFile(path.join(adaptiveFolder, "ic_launcher_round.xml"), adaptive, "utf8");
  console.log("Ícone vetorial de alta nitidez aplicado em todas as densidades Android.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
