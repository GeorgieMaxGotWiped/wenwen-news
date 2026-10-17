import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";

type MarkdownNode = {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
};

/**
 * 引用块内保留手动换行，多行引用按行排版，适合引述对话和诗句。
 * 普通段落仍遵循 Markdown 的软换行规则。
 */
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
 * 用户习惯直接写域名（如 example.com），补上 https://，
 * 避免预览和文章里出现指向站内相对路径的错误链接。
 */
function remarkNormalizeUrls() {
  const normalize = (url: string) => {
    if (!url || /^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
    if (/^[/#.]/.test(url)) return url;
    return /^[^\s/]+\.[^\s/]+/.test(url) ? `https://${url}` : url;
  };
  return (tree: unknown) => {
    const walk = (node: MarkdownNode) => {
      if (node.type === "link" || node.type === "image" || node.type === "definition") {
        if (typeof node.url === "string") node.url = normalize(node.url);
      }
      node.children?.forEach(walk);
    };
    walk(tree as MarkdownNode);
  };
}

/**
 * 渲染 Markdown 为 HTML。
 * 经过 rehype-sanitize 消毒，避免投稿内容里的链接或 HTML 注入脚本。
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkNormalizeUrls)
    .use(remarkQuoteLineBreaks)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(markdown);
  return processed.toString();
}
