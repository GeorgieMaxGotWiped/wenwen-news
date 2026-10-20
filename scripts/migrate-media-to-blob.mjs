import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { put } from "@vercel/blob";

const inputDir = path.resolve(process.argv[2] ?? ".tmp/store-raw-2026-10-20");
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const databaseUrl = process.env.TURSO_DATABASE_URL;

if (!blobToken) throw new Error("Missing BLOB_READ_WRITE_TOKEN");
if (!databaseUrl) throw new Error("Missing TURSO_DATABASE_URL");

const db = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function mediaFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await mediaFiles(fullPath)));
    } else if (!entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }
  return files;
}

function blobPath(value) {
  if (!value) return null;
  if (value.startsWith("/api/blob/")) return decodeURIComponent(value.slice("/api/blob/".length));
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith(".public.blob.vercel-storage.com")) return null;
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

const uploaded = new Map();
for (const directory of ["avatars", "uploads"]) {
  let files;
  try {
    files = await mediaFiles(path.join(inputDir, directory));
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  for (const file of files) {
    const pathname = path.relative(inputDir, file).split(path.sep).join("/");
    const result = await put(pathname, await readFile(file), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    uploaded.set(pathname, result.url);
  }
}

let updated = 0;
const tables = [
  ["users", "avatar"],
  ["submissions", "cover_url"],
  ["comments", "author_avatar"],
];

for (const [table, column] of tables) {
  const result = await db.execute(`SELECT id, ${column} AS value FROM ${table}`);
  for (const row of result.rows) {
    const pathname = blobPath(row.value == null ? null : String(row.value));
    const url = pathname ? uploaded.get(pathname) : null;
    if (!url || url === row.value) continue;
    await db.execute({
      sql: `UPDATE ${table} SET ${column} = ? WHERE id = ?`,
      args: [url, String(row.id)],
    });
    updated += 1;
  }
}

console.log(`Uploaded ${uploaded.size} media files; updated ${updated} database rows`);
