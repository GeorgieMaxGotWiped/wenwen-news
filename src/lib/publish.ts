import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { stringify as yamlStringify } from "yaml";
import type { Submission } from "@/lib/submissions";

export type PublishResult = { ok: true; filePath: string } | { ok: false; error: string };

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export function slugify(input: string, fallback: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return cleaned || fallback;
}

const plainText = (markdown: string) =>
  markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`~\-|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function buildPostMarkdown(submission: Submission, slug: string): string {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  const excerpt = submission.excerpt.trim() || plainText(submission.contentMd).slice(0, 80);
  const frontmatter: Record<string, string> = {
    title: submission.title,
    slug,
    date,
    category: submission.category,
    author: submission.authorName,
  };
  if (submission.coverUrl) frontmatter.cover = submission.coverUrl;
  frontmatter.excerpt = excerpt;
  return `---\n${yamlStringify(frontmatter)}---\n\n${submission.contentMd.trim()}\n`;
}

async function slugTaken(slug: string): Promise<boolean> {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (repo && token) {
    const filePath = `content/posts/${slug}.md`;
    const url = `https://api.github.com/repos/${repo}/contents/${filePath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    const response = await fetch(`${url}?ref=${encodeURIComponent(process.env.GITHUB_BRANCH ?? "main")}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "wenwen-news",
      },
      cache: "no-store",
    });
    return response.ok;
  }
  return existsSync(path.join(POSTS_DIR, `${slug}.md`));
}

export async function publishSubmission(submission: Submission): Promise<PublishResult> {
  const base = slugify(submission.slug || submission.title, `tougao-${submission.id}`);
  let slug = base;
  for (let index = 2; await slugTaken(slug); index += 1) {
    slug = `${base}-${index}`;
    if (index > 20) return { ok: false, error: "无法生成可用的 URL 标识，请手动修改后重试。" };
  }

  const markdown = buildPostMarkdown(submission, slug);
  const filePath = `content/posts/${slug}.md`;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  if (repo && token) {
    const url = `https://api.github.com/repos/${repo}/contents/${filePath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "wenwen-news",
      },
      body: JSON.stringify({
        message: `投稿发布：${submission.title}`,
        content: Buffer.from(markdown, "utf8").toString("base64"),
        branch: process.env.GITHUB_BRANCH ?? "main",
      }),
    });
    if (!response.ok) {
      return { ok: false, error: `提交到 GitHub 失败（${response.status}），请检查 GITHUB_TOKEN 权限。` };
    }
    return { ok: true, filePath };
  }

  // 未配置 GitHub 时：写入本机仓库目录，便于本地预览
  try {
    await mkdir(POSTS_DIR, { recursive: true });
    await writeFile(path.join(POSTS_DIR, `${slug}.md`), markdown, "utf8");
    return { ok: true, filePath };
  } catch {
    return {
      ok: false,
      error: "发布失败：请在部署环境配置 GITHUB_TOKEN 与 GITHUB_REPO，或在本机运行以写入文件。",
    };
  }
}
