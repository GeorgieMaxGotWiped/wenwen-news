import { randomBytes } from "node:crypto";
import { getDatabase } from "@/lib/database";

export type Comment = {
  id: string;
  postSlug: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  body: string;
  createdAt: string;
};

export const isValidPostSlug = (slug: string) => /^[a-z0-9-]{1,80}$/.test(slug);

function toComment(row: Record<string, unknown>): Comment {
  return {
    id: String(row.id),
    postSlug: String(row.post_slug),
    authorId: String(row.author_id),
    authorName: String(row.author_name),
    authorAvatar: row.author_avatar == null ? undefined : String(row.author_avatar),
    body: String(row.body),
    createdAt: String(row.created_at),
  };
}

export async function createComment(input: {
  postSlug: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  body: string;
}): Promise<Comment | null> {
  if (!isValidPostSlug(input.postSlug)) return null;
  const comment: Comment = {
    id: `c${Date.now().toString(36)}${randomBytes(3).toString("hex")}`,
    postSlug: input.postSlug,
    authorId: input.authorId,
    authorName: input.authorName,
    authorAvatar: input.authorAvatar,
    body: input.body,
    createdAt: new Date().toISOString(),
  };

  const db = await getDatabase();
  await db.execute({
    sql: `INSERT INTO comments
      (id, post_slug, author_id, author_name, author_avatar, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      comment.id,
      comment.postSlug,
      comment.authorId,
      comment.authorName,
      comment.authorAvatar ?? null,
      comment.body,
      comment.createdAt,
    ],
  });
  return comment;
}

export async function listComments(postSlug: string): Promise<Comment[]> {
  if (!isValidPostSlug(postSlug)) return [];
  const db = await getDatabase();
  const result = await db.execute({
    sql: "SELECT * FROM comments WHERE post_slug = ? ORDER BY created_at ASC",
    args: [postSlug],
  });
  return result.rows.map(toComment);
}
