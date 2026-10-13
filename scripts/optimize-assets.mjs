/**
 * 把 assets-src/ 里的原始素材处理成站点使用的 public/media/ 文件：
 * - 校徽（透明/白底方形）、favicon
 * - 「江苏省泰州中学」字标
 * - 射命丸文插画（webp）
 * - 分享卡片 og.jpg
 * 并打印校徽主色，供 CSS 使用。
 * 用法：npm run assets
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const src = path.join(root, "assets-src");
const out = path.join(root, "public", "media");
const appDir = path.join(root, "src", "app");

await mkdir(out, { recursive: true });

const emblemSource = path.join(src, "校徽-横版.png");
const emblemMeta = await sharp(emblemSource).metadata();
const leftSliceWidth = Math.min(
  emblemMeta.width ?? 0,
  Math.round((emblemMeta.height ?? 0) * 1.05),
);

// sharp 的 trim 与 extract 不能放在同一条管线里，分两段处理
const emblemSlice = await sharp(emblemSource)
  .extract({ left: 0, top: 0, width: leftSliceWidth, height: emblemMeta.height ?? 0 })
  .png()
  .toBuffer();

const emblemBuffer = await sharp(emblemSlice)
  .trim({ threshold: 12 })
  .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toBuffer();

await sharp(emblemBuffer).toFile(path.join(out, "emblem.png"));
await sharp(emblemBuffer).resize(128, 128).png().toFile(path.join(out, "emblem-sm.png"));
await sharp(emblemBuffer).resize(256, 256).png().toFile(path.join(appDir, "icon.png"));

// 生成多尺寸 favicon.ico（ICO 内嵌 PNG），避免浏览器请求 /favicon.ico 得到 404
const icoSizes = [16, 32, 48];
const icoPngs = [];
for (const size of icoSizes) {
  icoPngs.push(await sharp(emblemBuffer).resize(size, size).png().toBuffer());
}
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(icoPngs.length, 4);
let icoOffset = 6 + 16 * icoPngs.length;
const icoEntries = icoPngs.map((png, index) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(icoSizes[index], 0);
  entry.writeUInt8(icoSizes[index], 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(icoOffset, 12);
  icoOffset += png.length;
  return entry;
});
await writeFile(path.join(appDir, "favicon.ico"), Buffer.concat([icoHeader, ...icoEntries, ...icoPngs]));

const wordmarkWidth = Math.round((emblemMeta.width ?? 0) - leftSliceWidth - 8);
const wordmarkSlice = await sharp(emblemSource)
  .extract({ left: leftSliceWidth, top: 0, width: Math.max(wordmarkWidth, 10), height: emblemMeta.height ?? 0 })
  .png()
  .toBuffer();

await sharp(wordmarkSlice)
  .trim({ threshold: 12 })
  .resize({ width: 1260, withoutEnlargement: false })
  .png()
  .toFile(path.join(out, "wordmark.png"));

const cameraSource = path.join(src, "射命丸文-插画-相机.jfif");
await sharp(cameraSource).resize({ width: 1600 }).webp({ quality: 82 }).toFile(path.join(out, "aya-camera.webp"));
await sharp(cameraSource).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 84 }).toFile(path.join(out, "og.jpg"));

const flyingSource = path.join(src, "射命丸文-插画-飞行.webp");
await sharp(flyingSource).resize({ width: 1024 }).webp({ quality: 82 }).toFile(path.join(out, "aya-flying.webp"));

const standingSource = path.join(src, "射命丸文-立绘.png");
const standingTrimmed = await sharp(standingSource).trim({ threshold: 12 }).png().toBuffer();
const standingMeta = await sharp(standingTrimmed)
  .resize({ height: 900, withoutEnlargement: false })
  .webp({ quality: 85 })
  .toFile(path.join(out, "aya-standing.webp"));

const { data, info } = await sharp(emblemBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let r = 0;
let g = 0;
let b = 0;
let count = 0;
for (let i = 0; i < data.length; i += info.channels) {
  const alpha = data[i + 3];
  const luminance = (data[i] + data[i + 1] + data[i + 2]) / 3;
  if (alpha > 200 && luminance < 235) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  }
}
const hex = (value) => Math.round(value / count).toString(16).padStart(2, "0");
console.log(`校徽主色：#${hex(r)}${hex(g)}${hex(b)}（可直接用于 CSS 的 --brand）`);

const outputs = ["emblem.png", "emblem-sm.png", "wordmark.png", "aya-camera.webp", "aya-flying.webp", "aya-standing.webp", "og.jpg"];
for (const file of outputs) {
  const info = await sharp(path.join(out, file)).metadata();
  console.log(`${file}  ${info.width}x${info.height}`);
}
console.log(`立绘尺寸（供 404 页 width/height 使用）：${standingMeta.width}x${standingMeta.height}`);
