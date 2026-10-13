/**
 * 把 @sveltia/cms 就地化到 public/admin/vendor/：
 * - 主程序与分块（去掉 sourcemap）
 * - 全部界面语言包
 * - 界面字体
 * - 把包里默认的 CDN 地址改写为站内路径，避免国内网络访问 unpkg / jsdelivr
 * 用法：npm run vendor:cms（升级 @sveltia/cms 后重跑一次）
 */
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const pkgDir = path.join(root, "node_modules", "@sveltia", "cms");
const pkg = JSON.parse(await readFile(path.join(pkgDir, "package.json"), "utf8"));
const version = pkg.version;

const outDir = path.join(root, "public", "admin", "vendor");
const versionedDir = path.join(root, "public", "admin", `vendor@${version}`);

await rm(outDir, { recursive: true, force: true });
await rm(versionedDir, { recursive: true, force: true });
await mkdir(path.join(outDir, "dist"), { recursive: true });
await mkdir(path.join(outDir, "fonts"), { recursive: true });
await mkdir(path.join(versionedDir, "locales"), { recursive: true });

await cp(path.join(pkgDir, "dist", "sveltia-cms.js"), path.join(outDir, "dist", "sveltia-cms.js"));
await cp(path.join(pkgDir, "dist", "chunks"), path.join(outDir, "dist", "chunks"), {
  recursive: true,
  filter: (src) => !src.endsWith(".map"),
});
// 备用路径：个别环境取不到 document.currentScript 时会退回到带版本号的 CDN 地址，
// 这里把它也指向站内文件
await cp(path.join(pkgDir, "dist", "chunks"), path.join(versionedDir, "dist", "chunks"), {
  recursive: true,
  filter: (src) => !src.endsWith(".map"),
});

const localeFiles = await readdir(path.join(pkgDir, "locales"));
for (const file of localeFiles.filter((name) => name.endsWith(".json"))) {
  await cp(path.join(pkgDir, "locales", file), path.join(versionedDir, "locales", file));
}

const assetFiles = await readdir(path.join(pkgDir, "npm", "assets"));
const findAsset = (prefix) => assetFiles.find((name) => name.startsWith(prefix) && name.endsWith(".woff2"));

const fontMap = [
  ["source-sans-3", "source-sans-3.woff2"],
  ["noto-mono", "noto-mono.woff2"],
  ["material-symbols-outlined", "material-symbols.woff2"],
];

for (const [prefix, outputName] of fontMap) {
  const source = findAsset(prefix);
  if (!source) throw new Error(`找不到字体文件：${prefix}（@sveltia/cms 升级后请检查 npm/assets 目录）`);
  await cp(path.join(pkgDir, "npm", "assets", source), path.join(outDir, "fonts", outputName));
  const license = assetFiles.find((name) => name === `${prefix}.LICENSE.txt`);
  if (license) {
    await cp(path.join(pkgDir, "npm", "assets", license), path.join(outDir, "fonts", `${prefix}.LICENSE.txt`));
  }
}

const bundlePath = path.join(outDir, "dist", "sveltia-cms.js");
let bundle = await readFile(bundlePath, "utf8");

// 有些版本会请求脚本同级目录的 package.json（例如展示版本号、解析分块路径）
await writeFile(
  path.join(outDir, "package.json"),
  `${JSON.stringify({ name: pkg.name, version }, null, 2)}\n`,
);

const replaceAll = (input, pattern, replacement, label) => {
  const result = input.replace(pattern, replacement);
  if (result === input) throw new Error(`未能改写 CMS 包中的地址（${label}），升级后请检查`);
  return result;
};

bundle = replaceAll(bundle, /https:\/\/unpkg\.com\/@sveltia\/cms/g, "/admin/vendor", "unpkg 主包");
bundle = replaceAll(
  bundle,
  /https:\/\/cdn\.jsdelivr\.net\/fontsource\/fonts\/source-sans-3[^"'`)]*/g,
  "/admin/vendor/fonts/source-sans-3.woff2",
  "source-sans 字体",
);
bundle = replaceAll(
  bundle,
  /https:\/\/cdn\.jsdelivr\.net\/fontsource\/fonts\/noto-mono[^"'`)]*/g,
  "/admin/vendor/fonts/noto-mono.woff2",
  "noto-mono 字体",
);
bundle = replaceAll(
  bundle,
  /https:\/\/cdn\.jsdelivr\.net\/fontsource\/fonts\/material-symbols-outlined[^"'`)]*/g,
  "/admin/vendor/fonts/material-symbols.woff2",
  "material-symbols 字体",
);

if (bundle.includes("https://unpkg.com/@sveltia/cms") || bundle.includes("cdn.jsdelivr.net/fontsource")) {
  throw new Error("仍有未改写的 CDN 地址，请检查 CMS 包结构变化");
}

if (!bundle.includes("/admin/vendor")) {
  throw new Error("改写结果不符合预期，请检查 CMS 包结构变化");
}

await writeFile(bundlePath, bundle);
console.log(`CMS 已就地化：public/admin/vendor/（版本 ${version}，语言包在 vendor@${version}/locales/）`);
