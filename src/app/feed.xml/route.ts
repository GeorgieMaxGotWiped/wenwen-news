import { getAllPosts } from "@/lib/posts";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

const XML_ESCAPES: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
};

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (char) => XML_ESCAPES[char] ?? char);

export async function GET(): Promise<Response> {
  const base = getSiteUrl();
  const posts = getAllPosts().slice(0, 30);

  const items = posts
    .map((post) => {
      const link = `${base}/posts/${post.slug}`;
      const pubDate = new Date(`${post.date.slice(0, 10)}T00:00:00+08:00`).toUTCString();
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${escapeXml(post.excerpt)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${escapeXml(base)}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>zh-cn</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
