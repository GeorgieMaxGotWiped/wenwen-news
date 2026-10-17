/**
 * 把 assets-src/ 里的原始素材处理成站点使用的 public/media/ 文件：
 * - 校徽（圆形透明底）、favicon
 * - 「江苏省泰州中学」字标的浅色墨迹版（深色界面用）
 * - 射命丸文立绘与绯想天风格表情立绘（webp，透明底；含页面大背景用的柔化版）
 * - 立绘的浅色墨迹水印（页面背景用）与竖版校徽标识（页脚用）
 * - 分享卡片 og.jpg
 * 并打印校徽主色，供 CSS 使用。
 * 用法：npm run assets
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const src = path.join(root, "assets-src");
const out = path.join(root, "public", "media");
const appDir = path.join(root, "src", "app");

// public/media 完全由本脚本生成，先清空再重建，避免残留旧文件
await rm(out, { recursive: true, force: true });
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

const circleMask = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><circle cx="256" cy="256" r="255.5" fill="#ffffff"/></svg>',
);

const emblemBuffer = await sharp(emblemSlice)
  .trim({ threshold: 12 })
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .composite([{ input: circleMask, blend: "dest-in" }])
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

const wordmarkTrimmed = await sharp(wordmarkSlice).trim({ threshold: 12 }).png().toBuffer();

const standingSource = path.join(src, "射命丸文-立绘.png");
const standingTrimmed = await sharp(standingSource).trim({ threshold: 12 }).png().toBuffer();
const standingMeta = await sharp(standingTrimmed)
  .resize({ height: 900, withoutEnlargement: false })
  .webp({ quality: 85 })
  .toFile(path.join(out, "aya-standing.webp"));

// 绯想天风格表情立绘（200x200 透明底）：空状态配图与各页面大背景
const moodFiles = [
  ["200px-射命丸文（绯想天立绘）嬉.png", "aya-mood-cheer.webp"],
  ["200px-射命丸文（绯想天立绘）余.png", "aya-mood-calm.webp"],
  ["200px-射命丸文怒.png", "aya-mood-angry.webp"],
  ["200px-射命丸文負.png", "aya-mood-tired.webp"],
];
for (const [source, file] of moodFiles) {
  const trimmed = await sharp(path.join(src, source))
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 12 })
    .png()
    .toBuffer();
  const portrait = await sharp(trimmed)
    .resize(400, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp(portrait).webp({ quality: 88 }).toFile(path.join(out, file));
  await sharp(portrait)
    .resize(960, 960, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .blur(1.4)
    .webp({ quality: 84 })
    .toFile(path.join(out, file.replace(/\.webp$/, "-bg.webp")));
}

// 分享卡片：深色底 + 立绘 + 校徽与字标
const ogFigure = await sharp(standingTrimmed)
  .resize({ height: 560, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
const ogFigureMeta = await sharp(ogFigure).metadata();
const ogGlow = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><radialGradient id="g" cx="76%" cy="54%" r="48%"><stop offset="0" stop-color="#5ac8b6" stop-opacity="0.32"/><stop offset="0.6" stop-color="#5ac8b6" stop-opacity="0.12"/><stop offset="1" stop-color="#5ac8b6" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>',
);
await sharp({ create: { width: 1200, height: 630, channels: 4, background: { r: 0x0e, g: 0x15, b: 0x16, alpha: 1 } } })
  .composite([
    { input: ogGlow },
    {
      input: ogFigure,
      left: 1200 - (ogFigureMeta.width ?? 0) - 44,
      top: 630 - (ogFigureMeta.height ?? 0),
    },
    { input: await sharp(emblemBuffer).resize(150, 150).png().toBuffer(), left: 96, top: 148 },
    { input: await sharp(wordmarkTrimmed).resize({ width: 400 }).png().toBuffer(), left: 96, top: 326 },
  ])
  .jpeg({ quality: 86 })
  .toFile(path.join(out, "og.jpg"));

// 竖版校徽：页脚的出版标识（浅色墨迹版）
const stackSource = path.join(src, "校徽-竖版.png");
const stackTrimmed = await sharp(stackSource).trim({ threshold: 12 }).png().toBuffer();

// 插画转墨迹水印：亮部透明、暗部着色，可叠在深色背景上
const INK_LIGHT = { r: 0x86, g: 0xcb, b: 0xbf };
async function writeInkImage(input, output, resize, ink = INK_LIGHT) {
  const { data, info } = await sharp(input)
    .resize(resize)
    .flatten({ background: "#ffffff" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 1, j += 4) {
    pixels[j] = ink.r;
    pixels[j + 1] = ink.g;
    pixels[j + 2] = ink.b;
    pixels[j + 3] = 255 - data[i];
  }
  await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(output);
}

await writeInkImage(standingTrimmed, path.join(out, "ink-aya-standing.webp"), { height: 1100 });
const standingFlipBuffer = await sharp(standingTrimmed).flop().png().toBuffer();
await writeInkImage(standingFlipBuffer, path.join(out, "ink-aya-standing-flip.webp"), { height: 1100 });
await writeInkImage(wordmarkTrimmed, path.join(out, "wordmark-light.webp"), { width: 1000 });
await writeInkImage(stackTrimmed, path.join(out, "school-stack-light.webp"), { height: 160 });

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

const outputs = [
  "emblem.png",
  "emblem-sm.png",
  "aya-standing.webp",
  "aya-mood-cheer.webp",
  "aya-mood-calm.webp",
  "aya-mood-angry.webp",
  "aya-mood-tired.webp",
  "aya-mood-cheer-bg.webp",
  "aya-mood-calm-bg.webp",
  "aya-mood-angry-bg.webp",
  "aya-mood-tired-bg.webp",
  "ink-aya-standing.webp",
  "ink-aya-standing-flip.webp",
  "wordmark-light.webp",
  "school-stack-light.webp",
  "og.jpg",
];
for (const file of outputs) {
  const info = await sharp(path.join(out, file)).metadata();
  console.log(`${file}  ${info.width}x${info.height}`);
}
console.log(`立绘尺寸（供 404 页 width/height 使用）：${standingMeta.width}x${standingMeta.height}`);
