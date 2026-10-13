export const dynamic = "force-static";

const ADMIN_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>编辑部后台 · 文文。新闻</title>
    <link rel="icon" href="/icon.png" />
    <link rel="cms-config-url" href="/admin/config.yml" />
  </head>
  <body>
    <script src="/admin/vendor/dist/sveltia-cms.js"></script>
  </body>
</html>
`;

export function GET(): Response {
  return new Response(ADMIN_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
