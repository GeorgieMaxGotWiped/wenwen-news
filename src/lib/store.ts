import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put as blobPut } from "@vercel/blob";

const remoteEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
export const remoteStoreEnabled = remoteEnabled;

const localRoot = path.join(process.cwd(), ".tmp", "store");

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
