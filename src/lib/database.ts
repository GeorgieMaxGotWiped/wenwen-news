import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type Client } from "@libsql/client";

const localDatabasePath = path.join(process.cwd(), ".tmp", "wenwen.sqlite");

const schema = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    bio TEXT,
    avatar TEXT,
    salt TEXT NOT NULL,
    hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    category TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content_md TEXT NOT NULL,
    cover_url TEXT,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    status TEXT NOT NULL,
    review_note TEXT,
    created_at TEXT NOT NULL,
    reviewed_at TEXT,
    published_at TEXT,
    published_slug TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS submissions_created_at_idx
    ON submissions (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS submissions_author_id_idx
    ON submissions (author_id)`,
  `CREATE INDEX IF NOT EXISTS submissions_published_slug_idx
    ON submissions (published_slug)`,
  `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_slug TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS comments_post_slug_idx
    ON comments (post_slug, created_at)`,
];

const globalDatabase = globalThis as typeof globalThis & {
  __wenwenDatabase?: Promise<Client>;
};

function databaseConfig(): { url: string; authToken?: string } {
  const remoteUrl = process.env.TURSO_DATABASE_URL ?? process.env.LIBSQL_DATABASE_URL;
  if (remoteUrl) {
    return {
      url: remoteUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    };
  }

  if (process.env.VERCEL && process.env.NODE_ENV === "production") {
    throw new Error("未配置 TURSO_DATABASE_URL，线上数据库不可用。");
  }

  return { url: pathToFileURL(localDatabasePath).href };
}

async function createDatabase(): Promise<Client> {
  const config = databaseConfig();
  if (config.url.startsWith("file:")) {
    await mkdir(path.dirname(localDatabasePath), { recursive: true });
  }

  const client = createClient(config);
  await client.batch(schema, "write");
  return client;
}

export async function getDatabase(): Promise<Client> {
  if (!globalDatabase.__wenwenDatabase) {
    globalDatabase.__wenwenDatabase = createDatabase();
  }
  return globalDatabase.__wenwenDatabase;
}
