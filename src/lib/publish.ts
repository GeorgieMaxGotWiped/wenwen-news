import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { stringify as yamlStringify } from "yaml";
import { parseFrontmatter } from "@/lib/frontmatter";
import type { Submission } from "@/lib/submissions";

export type PublishResult =
  | { ok: true; filePath: string; alreadyPublished: boolean }
  | { ok: false; error: string };

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
// A retried approval can find its own post instead of creating a suffixed duplicate.
const SUBMISSION_ID_FIELD = "submissionId";

type ExistingPost = { exists: false } | { exists: true; submissionId?: string };
type CreatePostResult =
  | { ok: true }
  | { ok: false; conflict: boolean; error: string };

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
    [SUBMISSION_ID_FIELD]: submission.id,
  };
  if (submission.coverUrl) frontmatter.cover = submission.coverUrl;
  frontmatter.excerpt = excerpt;
  return `---\n${yamlStringify(frontmatter)}---\n\n${submission.contentMd.trim()}\n`;
}

const githubHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "wenwen-news",
});

const githubContentsUrl = (repo: string, filePath: string) =>
  `https://api.github.com/repos/${repo}/contents/${filePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

async function readPublishedPost(filePath: string): Promise<ExistingPost> {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (repo && token) {
    const response = await fetch(
      `${githubContentsUrl(repo, filePath)}?ref=${encodeURIComponent(process.env.GITHUB_BRANCH ?? "main")}`,
      {
        headers: githubHeaders(token),
        cache: "no-store",
      },
    );
    if (response.status === 404) return { exists: false };
    if (!response.ok) {
      throw new Error(`读取 GitHub 文章失败（${response.status}）`);
    }
    const data = (await response.json()) as { content?: string; encoding?: string };
    if (!data.content || data.encoding !== "base64") return { exists: true };
    const raw = Buffer.from(data.content, "base64").toString("utf8");
    const { data: frontmatter } = parseFrontmatter(raw);
    const submissionId =
      typeof frontmatter[SUBMISSION_ID_FIELD] === "string" ? frontmatter[SUBMISSION_ID_FIELD] : undefined;
    return { exists: true, submissionId };
  }

  try {
    const raw = await readFile(path.join(POSTS_DIR, path.basename(filePath)), "utf8");
    const { data: frontmatter } = parseFrontmatter(raw);
    const submissionId =
      typeof frontmatter[SUBMISSION_ID_FIELD] === "string" ? frontmatter[SUBMISSION_ID_FIELD] : undefined;
    return { exists: true, submissionId };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { exists: false };
    throw error;
  }
}

async function createPublishedPost(
  filePath: string,
  markdown: string,
  title: string,
): Promise<CreatePostResult> {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  if (repo && token) {
    const response = await fetch(githubContentsUrl(repo, filePath), {
      method: "PUT",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `投稿发布：${title}`,
        content: Buffer.from(markdown, "utf8").toString("base64"),
        branch: process.env.GITHUB_BRANCH ?? "main",
      }),
    });
    if (response.ok) return { ok: true };
    return {
      ok: false,
      conflict: response.status === 409 || response.status === 422,
      error: `提交到 GitHub 失败（${response.status}），请检查 GITHUB_TOKEN 权限。`,
    };
  }

  try {
    await mkdir(POSTS_DIR, { recursive: true });
    await writeFile(path.join(POSTS_DIR, path.basename(filePath)), markdown, {
      encoding: "utf8",
      flag: "wx",
    });
    return { ok: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return { ok: false, conflict: true, error: "目标文章文件已存在。" };
    }
    return {
      ok: false,
      conflict: false,
      error: "发布失败：请在部署环境配置 GITHUB_TOKEN 与 GITHUB_REPO，或在本机运行以写入文件。",
    };
  }
}

export async function publishSubmission(submission: Submission): Promise<PublishResult> {
  const base = slugify(submission.slug || submission.title, `tougao-${submission.id}`);

  try {
    for (let index = 1; index <= 20; index += 1) {
      const slug = index === 1 ? base : `${base}-${index}`;
      const filePath = `content/posts/${slug}.md`;
      const existing = await readPublishedPost(filePath);

      if (existing.exists) {
        if (existing.submissionId === submission.id) {
          return { ok: true, filePath, alreadyPublished: true };
        }
        continue;
      }

      const markdown = buildPostMarkdown(submission, slug);
      const created = await createPublishedPost(filePath, markdown, submission.title);
      if (created.ok) {
        return { ok: true, filePath, alreadyPublished: false };
      }
      if (!created.conflict) return created;

      const raced = await readPublishedPost(filePath);
      if (raced.exists && raced.submissionId === submission.id) {
        return { ok: true, filePath, alreadyPublished: true };
      }
      if (!raced.exists) return created;
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "发布失败，请稍后重试。",
    };
  }

  return { ok: false, error: "无法生成可用的 URL 标识，请手动修改后重试。" };
}
