import { randomBytes } from "node:crypto";
import { storeGetText, storeList, storePut } from "@/lib/store";

export type Comment = {
  id: string;
  postSlug: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export const isValidPostSlug = (slug: string) => /^[a-z0-9-]{1,80}$/.test(slug);

const commentPath = (postSlug: string, id: string) => `comments/${postSlug}/${id}.json`;

export async function createComment(input: {
  postSlug: string;
  authorId: string;
  authorName: string;
  body: string;
}): Promise<Comment | null> {
  if (!isValidPostSlug(input.postSlug)) return null;
  const id = `c${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
  const comment: Comment = {
    id,
    postSlug: input.postSlug,
    authorId: input.authorId,
    authorName: input.authorName,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  await storePut(commentPath(input.postSlug, id), JSON.stringify(comment, null, 2), "application/json");
  return comment;
}

export async function listComments(postSlug: string): Promise<Comment[]> {
  if (!isValidPostSlug(postSlug)) return [];
  const entries = await storeList(`comments/${postSlug}/`);
  const comments: Comment[] = [];
  for (const entry of entries) {
    if (!entry.pathname.endsWith(".json")) continue;
    const text = await storeGetText(entry.pathname);
    if (!text) continue;
    try {
      comments.push(JSON.parse(text) as Comment);
    } catch {
      // 忽略损坏的数据文件
    }
  }
  return comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
