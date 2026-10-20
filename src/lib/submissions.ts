import { randomBytes } from "node:crypto";
import { getDatabase } from "@/lib/database";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type Submission = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  contentMd: string;
  coverUrl?: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  status: SubmissionStatus;
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
  publishedAt?: string;
  publishedSlug?: string;
};

export type SubmissionInput = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  contentMd: string;
  coverUrl?: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
};

function toSubmission(row: Record<string, unknown>): Submission {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    category: String(row.category),
    excerpt: String(row.excerpt),
    contentMd: String(row.content_md),
    coverUrl: row.cover_url == null ? undefined : String(row.cover_url),
    authorId: String(row.author_id),
    authorName: String(row.author_name),
    authorEmail: String(row.author_email),
    status: String(row.status) as SubmissionStatus,
    reviewNote: row.review_note == null ? undefined : String(row.review_note),
    createdAt: String(row.created_at),
    reviewedAt: row.reviewed_at == null ? undefined : String(row.reviewed_at),
    publishedAt: row.published_at == null ? undefined : String(row.published_at),
    publishedSlug: row.published_slug == null ? undefined : String(row.published_slug),
  };
}

export async function createSubmission(input: SubmissionInput): Promise<Submission> {
  const id = `s${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
  const submission: Submission = {
    id,
    ...input,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const db = await getDatabase();
  await db.execute({
    sql: `INSERT INTO submissions
      (id, title, slug, category, excerpt, content_md, cover_url,
       author_id, author_name, author_email, status, review_note,
       created_at, reviewed_at, published_at, published_slug)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      submission.id,
      submission.title,
      submission.slug,
      submission.category,
      submission.excerpt,
      submission.contentMd,
      submission.coverUrl ?? null,
      submission.authorId,
      submission.authorName,
      submission.authorEmail,
      submission.status,
      submission.reviewNote ?? null,
      submission.createdAt,
      submission.reviewedAt ?? null,
      submission.publishedAt ?? null,
      submission.publishedSlug ?? null,
    ],
  });
  return submission;
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const db = await getDatabase();
  const result = await db.execute({
    sql: "SELECT * FROM submissions WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = result.rows[0];
  return row ? toSubmission(row) : null;
}

export async function updateSubmission(id: string, patch: Partial<Submission>): Promise<Submission | null> {
  const current = await getSubmission(id);
  if (!current) return null;
  const next = { ...current, ...patch };

  const db = await getDatabase();
  await db.execute({
    sql: `UPDATE submissions SET
      title = ?, slug = ?, category = ?, excerpt = ?, content_md = ?,
      cover_url = ?, author_id = ?, author_name = ?, author_email = ?,
      status = ?, review_note = ?, created_at = ?, reviewed_at = ?,
      published_at = ?, published_slug = ?
      WHERE id = ?`,
    args: [
      next.title,
      next.slug,
      next.category,
      next.excerpt,
      next.contentMd,
      next.coverUrl ?? null,
      next.authorId,
      next.authorName,
      next.authorEmail,
      next.status,
      next.reviewNote ?? null,
      next.createdAt,
      next.reviewedAt ?? null,
      next.publishedAt ?? null,
      next.publishedSlug ?? null,
      next.id,
    ],
  });
  return next;
}

export async function listSubmissions(): Promise<Submission[]> {
  const db = await getDatabase();
  const result = await db.execute("SELECT * FROM submissions ORDER BY created_at DESC");
  return result.rows.map(toSubmission);
}
