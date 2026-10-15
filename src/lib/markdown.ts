import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";

/**
 * 渲染 Markdown 为 HTML。
 * 经过 rehype-sanitize 消毒，避免投稿内容里的链接或 HTML 注入脚本。
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(markdown);
  return processed.toString();
}
