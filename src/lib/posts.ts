import fs from "node:fs";
import path from "node:path";
import { categoryName } from "@/lib/categories";
import { parseFrontmatter } from "@/lib/frontmatter";
import { renderMarkdown } from "@/lib/markdown";

const POSTS_DIR = path.join(process.cwd(), "content/posts");
const IS_DEV = process.env.NODE_ENV === "development";

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  category: string;
  author: string;
  cover?: string;
  excerpt: string;
  draft: boolean;
  words: number;
};

export type Post = PostMeta & { html: string };

export type SearchIndexItem = {
  slug: string;
  title: string;
  author: string;
  dateText: string;
  categoryName: string;
  excerpt: string;
  text: string;
};

const asText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

// YAML 会把 `date: 2026-10-13` 解析成 Date 对象，这里统一成 YYYY-MM-DD 字符串
const asDate = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return (asText(value) ?? "").slice(0, 10);
};

function listFiles(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR).filter((file) => file.endsWith(".md"));
}

function readParsed(file: string): { data: Record<string, unknown>; content: string } {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
  return parseFrontmatter(raw);
}

export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`~\-|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(text: string): number {
  const cjk = text.match(/[\u3400-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  const latin = text.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, " ").match(/[A-Za-z0-9]+/g)?.length ?? 0;
  return cjk + latin;
}

function toMeta(file: string, data: Record<string, unknown>, content: string): PostMeta {
  const body = plainText(content);
  return {
    slug: file.replace(/\.md$/, ""),
    title: asText(data.title) ?? file.replace(/\.md$/, ""),
    date: asDate(data.date),
    category: asText(data.category) ?? "",
    author: asText(data.author) ?? "未署名",
    cover: asText(data.cover),
    excerpt: asText(data.excerpt) ?? body.slice(0, 88),
    draft: data.draft === true,
    words: countWords(body),
  };
}

function sortByDate(a: PostMeta, b: PostMeta): number {
  if (a.date === b.date) return a.title.localeCompare(b.title, "zh-CN");
  return b.date.localeCompare(a.date);
}

export function getAllPosts(): PostMeta[] {
  return listFiles()
    .map((file) => {
      const { data, content } = readParsed(file);
      return toMeta(file, data, content);
    })
    .filter((post) => IS_DEV || !post.draft)
    .sort(sortByDate);
}

export function getPostsByCategory(category: string): PostMeta[] {
  return getAllPosts().filter((post) => post.category === category);
}

export async function getPost(slug: string): Promise<Post | null> {
  const file = `${slug}.md`;
  if (!listFiles().includes(file)) return null;
  const { data, content } = readParsed(file);
  const meta = toMeta(file, data, content);
  if (!IS_DEV && meta.draft) return null;
  const html = await renderMarkdown(content);
  return { ...meta, html };
}

export function getSearchIndex(): SearchIndexItem[] {
  return listFiles()
    .map((file) => {
      const { data, content } = readParsed(file);
      return { meta: toMeta(file, data, content), content };
    })
    .filter(({ meta }) => IS_DEV || !meta.draft)
    .map(({ meta, content }) => ({
      slug: meta.slug,
      title: meta.title,
      author: meta.author,
      dateText: formatDateShort(meta.date),
      categoryName: categoryName(meta.category),
      excerpt: meta.excerpt,
      text: plainText(content).slice(0, 1500),
    }))
    .sort((a, b) => b.dateText.localeCompare(a.dateText, "zh-CN"));
}

export function formatDate(date: string): string {
  const [year, month, day] = date.slice(0, 10).split("-");
  if (!year || !month || !day) return date;
  return `${Number(year)}年${Number(month)}月${Number(day)}日`;
}

export function formatDateShort(date: string): string {
  const [, month, day] = date.slice(0, 10).split("-");
  if (!month || !day) return date;
  return `${Number(month)}月${Number(day)}日`;
}
