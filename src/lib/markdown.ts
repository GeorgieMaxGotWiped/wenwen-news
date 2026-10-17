import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
};

// 引用块内保留手动换行，多行引用按行排版，适合引述对话和诗句
function remarkQuoteLineBreaks() {
  return (tree: unknown) => {
    const walk = (node: MarkdownNode, inQuote: boolean) => {
      const insideQuote = inQuote || node.type === "blockquote";
      if (insideQuote && node.type === "paragraph" && node.children) {
        const next: MarkdownNode[] = [];
        for (const child of node.children) {
          if (child.type === "text" && child.value?.includes("\n")) {
            child.value.split("\n").forEach((line, index) => {
              if (index > 0) next.push({ type: "break" });
              if (line) next.push({ type: "text", value: line });
            });
          } else {
            next.push(child);
          }
        }
        node.children = next;
      }
      node.children?.forEach((child) => walk(child, insideQuote));
    };
    walk(tree as MarkdownNode, false);
  };
}

/**
 * 渲染 Markdown 为 HTML。
 * 经过 rehype-sanitize 消毒，避免投稿内容里的链接或 HTML 注入脚本。
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkQuoteLineBreaks)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(markdown);
  return processed.toString();
}
