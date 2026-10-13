import { parse } from "yaml";

export type Frontmatter = {
  data: Record<string, unknown>;
  content: string;
};

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;

export function parseFrontmatter(raw: string): Frontmatter {
  const match = raw.match(FRONTMATTER_PATTERN);
  if (!match) return { data: {}, content: raw };
  const data = (parse(match[1]) ?? {}) as Record<string, unknown>;
  return { data, content: raw.slice(match[0].length) };
}
