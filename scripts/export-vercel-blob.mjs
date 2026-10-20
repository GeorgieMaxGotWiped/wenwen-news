import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { list } from "@vercel/blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  throw new Error("Missing BLOB_READ_WRITE_TOKEN");
}

const outputDir = path.resolve(process.argv[2] ?? ".tmp/store-migration");
const rewriteUrls = process.env.REWRITE_BLOB_URLS === "1";
const manifest = {
  exportedAt: new Date().toISOString(),
  outputDir,
  rewrittenUrls: rewriteUrls,
  files: [],
  errors: [],
};

function safeRelativePath(pathname) {
  const normalized = path.posix.normalize(pathname.replaceAll("\\", "/"));
  if (normalized.startsWith("..") || path.posix.isAbsolute(normalized)) {
    throw new Error(`Unsafe blob pathname: ${pathname}`);
  }
  return normalized;
}

function rewriteBlobUrls(value) {
  if (Array.isArray(value)) return value.map(rewriteBlobUrls);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, rewriteBlobUrls(item)]),
    );
  }
  if (typeof value !== "string") return value;

  try {
    const url = new URL(value);
    if (!url.hostname.endsWith(".public.blob.vercel-storage.com")) return value;
    const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    return `/api/blob/${pathname}`;
  } catch {
    return value;
  }
}

async function writeBlob(pathname, body) {
  const outputPath = path.join(outputDir, ...safeRelativePath(pathname).split("/"));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, body);
}

let cursor;
let count = 0;

for (;;) {
  const page = await list({ token, cursor, limit: 1000 });
  for (const blob of page.blobs) {
    try {
      const response = await fetch(blob.url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      let body = Buffer.from(await response.arrayBuffer());
      if (rewriteUrls && blob.pathname.endsWith(".json")) {
        const parsed = JSON.parse(body.toString("utf8"));
        body = Buffer.from(JSON.stringify(rewriteBlobUrls(parsed), null, 2), "utf8");
      }

      await writeBlob(blob.pathname, body);
      manifest.files.push({ pathname: blob.pathname, bytes: body.length });
      count += 1;
    } catch (error) {
      manifest.errors.push({
        pathname: blob.pathname,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!page.hasMore || !page.cursor) break;
  cursor = page.cursor;
}

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "export-manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`Exported ${count} files to ${outputDir}`);
if (manifest.errors.length > 0) {
  console.error(`Failed to export ${manifest.errors.length} files`);
  process.exitCode = 1;
}
