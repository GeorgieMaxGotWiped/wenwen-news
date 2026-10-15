import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const localRoot = path.join(process.cwd(), ".tmp", "store");

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".json": "application/json; charset=utf-8",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  // 部署在 Vercel 时图片走 Blob 直链，这个路由只服务本机开发的数据
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { path: segments } = await params;
  const resolved = path.resolve(path.join(localRoot, ...segments));
  if (!resolved.startsWith(path.resolve(localRoot) + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const data = await readFile(resolved);
    const type = CONTENT_TYPES[path.extname(resolved).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": type, "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
