import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter } from "@/lib/frontmatter";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const POSTS_ROUTE = "content/posts";
const SAFE_SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

type StoredPost = {
  markdown: string;
  sha?: string;
};

export type UpdateCategoryResult =
  | { ok: true; changed: boolean }
  | { ok: false; error: string; missing?: boolean };

export function isSafePostSlug(slug: string): boolean {
  return SAFE_SLUG.test(slug) && !slug.includes("..") && !slug.endsWith(".");
}

export function replacePostCategory(markdown: string, category: string): string | null {
  const frontmatter = markdown.match(/^(---\r?\n)([\s\S]*?)(\r?\n---[ \t]*(?:\r?\n|$))/);
  if (!frontmatter) return null;

  const [, open, body, close] = frontmatter;
  if (!/^category[ \t]*:/m.test(body)) return null;

  const nextBody = body.replace(/^category[ \t]*:[^\r\n]*/m, `category: ${category}`);
  const updated = `${open}${nextBody}${close}${markdown.slice(frontmatter[0].length)}`;
  if (parseFrontmatter(updated).data.category !== category) {
    throw new Error("分区字段写入失败。");
  }
  return updated;
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

function githubConfig(): { repo: string; token: string } | null {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  return repo && token ? { repo, token } : null;
}

async function readStoredPost(slug: string): Promise<StoredPost | null> {
  const github = githubConfig();
  const filePath = `${POSTS_ROUTE}/${slug}.md`;

  if (github) {
    const branch = process.env.GITHUB_BRANCH ?? "main";
    const response = await fetch(
      `${githubContentsUrl(github.repo, filePath)}?ref=${encodeURIComponent(branch)}`,
      {
        headers: githubHeaders(github.token),
        cache: "no-store",
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`读取文章失败（${response.status}）`);

    const data = (await response.json()) as {
      content?: string;
      encoding?: string;
      sha?: string;
    };
    if (!data.sha || data.encoding !== "base64" || typeof data.content !== "string") {
      throw new Error("文章内容过大或格式不受支持，请到内容后台修改。");
    }
    return {
      markdown: Buffer.from(data.content, "base64").toString("utf8"),
      sha: data.sha,
    };
  }

  try {
    return { markdown: await readFile(path.join(POSTS_DIR, `${slug}.md`), "utf8") };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeStoredPost(slug: string, markdown: string, sha?: string): Promise<void> {
  const github = githubConfig();
  const filePath = `${POSTS_ROUTE}/${slug}.md`;

  if (github) {
    const response = await fetch(githubContentsUrl(github.repo, filePath), {
      method: "PUT",
      headers: {
        ...githubHeaders(github.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `更新分区：${slug}`,
        content: Buffer.from(markdown, "utf8").toString("base64"),
        branch: process.env.GITHUB_BRANCH ?? "main",
        sha,
      }),
    });
    if (!response.ok) {
      throw new Error(`提交文章修改失败（${response.status}），请稍后重试。`);
    }
    return;
  }

  await writeFile(path.join(POSTS_DIR, `${slug}.md`), markdown, "utf8");
}

export async function updatePublishedPostCategory(
  slug: string,
  category: string,
): Promise<UpdateCategoryResult> {
  if (!isSafePostSlug(slug)) return { ok: false, error: "文章标识无效。", missing: true };

  try {
    const post = await readStoredPost(slug);
    if (!post) return { ok: false, error: "文章不存在或已经下线。", missing: true };

    const current = parseFrontmatter(post.markdown).data.category;
    if (typeof current === "string" && current.trim() === category) {
      return { ok: true, changed: false };
    }

    const updated = replacePostCategory(post.markdown, category);
    if (!updated) {
      return { ok: false, error: "这篇文章缺少可修改的分区字段。" };
    }

    await writeStoredPost(slug, updated, post.sha);
    return { ok: true, changed: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "修改分区失败，请稍后重试。",
    };
  }
}
