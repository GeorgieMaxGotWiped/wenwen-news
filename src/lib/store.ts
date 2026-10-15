import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { list as blobList, put as blobPut } from "@vercel/blob";

const remoteEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
export const remoteStoreEnabled = remoteEnabled;

const localRoot = path.join(process.cwd(), ".tmp", "store");

export type StoreEntry = {
  pathname: string;
  url: string;
  size: number;
  uploadedAt: Date;
};

function safePath(pathname: string): string {
  const normalized = path.posix.normalize(pathname);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    throw new Error(`非法的存储路径：${pathname}`);
  }
  return normalized;
}

const localPath = (pathname: string) => path.join(localRoot, ...safePath(pathname).split("/"));

export async function storePut(
  pathname: string,
  body: string | Buffer,
  contentType?: string,
): Promise<{ pathname: string; url: string }> {
  const safe = safePath(pathname);
  if (remoteEnabled) {
    const result = await blobPut(safe, body, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { pathname: safe, url: result.url };
  }
  const file = localPath(safe);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  return { pathname: safe, url: `/api/blob/${safe}` };
}

async function walkLocal(dir: string, out: StoreEntry[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkLocal(full, out);
      continue;
    }
    const info = await stat(full);
    const pathname = path.relative(localRoot, full).split(path.sep).join("/");
    out.push({ pathname, url: `/api/blob/${pathname}`, size: info.size, uploadedAt: info.mtime });
  }
}

export async function storeList(prefix: string): Promise<StoreEntry[]> {
  const safe = safePath(prefix);
  if (remoteEnabled) {
    const entries: StoreEntry[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await blobList({ prefix: safe, cursor, limit: 1000 });
      entries.push(
        ...page.blobs.map((blob) => ({
          pathname: blob.pathname,
          url: blob.url,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        })),
      );
      if (!page.hasMore || !page.cursor) break;
      cursor = page.cursor;
    }
    return entries;
  }
  const out: StoreEntry[] = [];
  await walkLocal(localPath(safe), out);
  return out;
}

export async function storeGetBuffer(pathname: string): Promise<Buffer | null> {
  const safe = safePath(pathname);
  if (remoteEnabled) {
    const entry = (await storeList(safe)).find((item) => item.pathname === safe);
    if (!entry) return null;
    const response = await fetch(entry.url, { cache: "no-store" });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  }
  try {
    return await readFile(localPath(safe));
  } catch {
    return null;
  }
}

export async function storeGetText(pathname: string): Promise<string | null> {
  const buffer = await storeGetBuffer(pathname);
  return buffer ? buffer.toString("utf8") : null;
}
