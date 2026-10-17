import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { parseFrontmatter } from "@/lib/frontmatter";
import { renderMarkdown } from "@/lib/markdown";
import { getSite } from "@/lib/site";

export const metadata: Metadata = {
  title: "关于本刊",
};

export default async function AboutPage() {
  const raw = fs.readFileSync(path.join(process.cwd(), "content/pages/about.md"), "utf8");
  const { data, content } = parseFrontmatter(raw);
  const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : "关于本刊";
  const html = await renderMarkdown(content);
  const site = getSite();

  return (
    <div className="about">
      <h1 className="section-title">{title}</h1>
      <div className="about-grid">
        <div className="prose about-body" dangerouslySetInnerHTML={{ __html: html }} />
        <aside className="about-side">
          <div className="about-mark">
            <img src="/media/wordmark-light.webp" alt="江苏省泰州中学" />
          </div>
        </aside>
      </div>
      <p className="about-credits">{site.credits}</p>
    </div>
  );
}
