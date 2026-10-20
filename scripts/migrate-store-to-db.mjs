import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";

const inputDir = path.resolve(process.argv[2] ?? ".tmp/store-migration-2026-10-20");
const localPath = path.join(process.cwd(), ".tmp", "wenwen.sqlite");
const remoteUrl = process.env.TURSO_DATABASE_URL ?? process.env.LIBSQL_DATABASE_URL;
const rewriteMediaUrls = process.env.REWRITE_MEDIA_URLS === "1";
const client = createClient({
  url: remoteUrl ?? pathToFileURL(localPath).href,
  authToken: remoteUrl ? process.env.TURSO_AUTH_TOKEN : undefined,
});

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
  `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_slug TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS submissions_created_at_idx
    ON submissions (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS submissions_author_id_idx
    ON submissions (author_id)`,
  `CREATE INDEX IF NOT EXISTS submissions_published_slug_idx
    ON submissions (published_slug)`,
  `CREATE INDEX IF NOT EXISTS comments_post_slug_idx
    ON comments (post_slug, created_at)`,
];

async function jsonFiles(dir) {
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return files;
    throw error;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await jsonFiles(fullPath)));
    } else if (entry.name.endsWith(".json") && entry.name !== "export-manifest.json") {
      files.push(fullPath);
    }
  }
  return files;
}

function rewriteBlobUrl(value) {
  if (typeof value !== "string") return value;
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith(".public.blob.vercel-storage.com")) return value;
    return `/api/blob/${decodeURIComponent(url.pathname.replace(/^\/+/, ""))}`;
  } catch {
    return value;
  }
}

async function readJsonFiles(dir) {
  const items = [];
  for (const file of await jsonFiles(dir)) {
    try {
      items.push(JSON.parse(await readFile(file, "utf8")));
    } catch {
      // Ignore malformed export files and continue with the remaining rows.
    }
  }
  return items;
}

async function upsertUser(user) {
  await client.execute({
    sql: `INSERT INTO users
      (id, email, name, bio, avatar, salt, hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        name = excluded.name,
        bio = excluded.bio,
        avatar = excluded.avatar,
        salt = excluded.salt,
        hash = excluded.hash,
        created_at = excluded.created_at`,
    args: [
      user.id,
      user.email,
      user.name,
      user.bio ?? null,
      (rewriteMediaUrls ? rewriteBlobUrl(user.avatar) : user.avatar) ?? null,
      user.salt,
      user.hash,
      user.createdAt,
    ],
  });
}

async function upsertSubmission(item) {
  await client.execute({
    sql: `INSERT INTO submissions
      (id, title, slug, category, excerpt, content_md, cover_url,
       author_id, author_name, author_email, status, review_note,
       created_at, reviewed_at, published_at, published_slug)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        slug = excluded.slug,
        category = excluded.category,
        excerpt = excluded.excerpt,
        content_md = excluded.content_md,
        cover_url = excluded.cover_url,
        author_id = excluded.author_id,
        author_name = excluded.author_name,
        author_email = excluded.author_email,
        status = excluded.status,
        review_note = excluded.review_note,
        created_at = excluded.created_at,
        reviewed_at = excluded.reviewed_at,
        published_at = excluded.published_at,
        published_slug = excluded.published_slug`,
    args: [
      item.id,
      item.title,
      item.slug,
      item.category,
      item.excerpt,
      item.contentMd,
      (rewriteMediaUrls ? rewriteBlobUrl(item.coverUrl) : item.coverUrl) ?? null,
      item.authorId,
      item.authorName,
      item.authorEmail,
      item.status,
      item.reviewNote ?? null,
      item.createdAt,
      item.reviewedAt ?? null,
      item.publishedAt ?? null,
      item.publishedSlug ?? null,
    ],
  });
}

async function upsertComment(comment) {
  await client.execute({
    sql: `INSERT INTO comments
      (id, post_slug, author_id, author_name, author_avatar, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        post_slug = excluded.post_slug,
        author_id = excluded.author_id,
        author_name = excluded.author_name,
        author_avatar = excluded.author_avatar,
        body = excluded.body,
        created_at = excluded.created_at`,
    args: [
      comment.id,
      comment.postSlug,
      comment.authorId,
      comment.authorName,
      (rewriteMediaUrls ? rewriteBlobUrl(comment.authorAvatar) : comment.authorAvatar) ?? null,
      comment.body,
      comment.createdAt,
    ],
  });
}

await client.batch(schema, "write");

const users = await readJsonFiles(path.join(inputDir, "users"));
const submissions = await readJsonFiles(path.join(inputDir, "submissions"));
const comments = await readJsonFiles(path.join(inputDir, "comments"));

for (const user of users) await upsertUser(user);
for (const submission of submissions) await upsertSubmission(submission);
for (const comment of comments) await upsertComment(comment);

console.log(
  `Migrated ${users.length} users, ${submissions.length} submissions, ${comments.length} comments`,
);
console.log(remoteUrl ? "Target: remote libSQL/Turso" : `Target: ${localPath}`);
