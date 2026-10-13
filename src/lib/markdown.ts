import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

export async function renderMarkdown(markdown: string): Promise<string> {
  const processed = await remark().use(remarkGfm).use(remarkHtml).process(markdown);
  return processed.toString();
}
