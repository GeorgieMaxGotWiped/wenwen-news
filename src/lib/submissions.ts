import { randomBytes } from "node:crypto";
import { storeGetText, storeList, storePut } from "@/lib/store";

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

const submissionPath = (id: string) => `submissions/${id}.json`;

export async function createSubmission(input: SubmissionInput): Promise<Submission> {
  const id = `s${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
  const submission: Submission = {
    id,
    ...input,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await storePut(submissionPath(id), JSON.stringify(submission, null, 2), "application/json");
  return submission;
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const text = await storeGetText(submissionPath(id));
  if (!text) return null;
  try {
    return JSON.parse(text) as Submission;
  } catch {
    return null;
  }
}

export async function updateSubmission(id: string, patch: Partial<Submission>): Promise<Submission | null> {
  const current = await getSubmission(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await storePut(submissionPath(id), JSON.stringify(next, null, 2), "application/json");
  return next;
}

export async function listSubmissions(): Promise<Submission[]> {
  const entries = await storeList("submissions/");
  const items: Submission[] = [];
  for (const entry of entries) {
    if (!entry.pathname.endsWith(".json")) continue;
    const text = await storeGetText(entry.pathname);
    if (!text) continue;
    try {
      items.push(JSON.parse(text) as Submission);
    } catch {
      // 忽略损坏的数据文件
    }
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
