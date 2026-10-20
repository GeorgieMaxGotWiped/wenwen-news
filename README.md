# 文文。新闻

江苏省泰州中学学生自办的校园刊物站点。技术栈：Next.js（App Router）+ Markdown 内容 + Sveltia CMS 内容后台 + SQLite（libSQL/Turso）+ Vercel 部署。

## 目录结构

```
content/
  posts/            文章（Markdown，一篇一个文件）
  pages/about.md    「关于本刊」页面正文
  settings/site.yml 期号、页脚说明、素材授权说明
public/
  admin/            内容后台（/admin/）
  media/            站点图片（由 assets-src 生成）
  uploads/          后台上传的图片
assets-src/         原始素材（不参与构建）
scripts/
  optimize-assets.mjs  处理素材 → public/media
  vendor-cms.mjs       把 CMS 就地化到 public/admin/vendor
src/
  app/              页面与接口
  components/       站头、站尾、列表等
  lib/              数据读取、数据库、栏目、SEO 配置
```

## 本地开发

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 构建检查
npm run typecheck  # 类型检查
```

## 写文章

推荐用内容后台（`/admin/`）：登录后在图形界面里写标题、正文、传图，保存即提交到仓库，Vercel 会自动重新部署。也可以用 GitHub 网页直接新建 `content/posts/xxx.md`，或本地写好文件再推上去。

文章头部（frontmatter）字段：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 标题 |
| `slug` | 是 | URL 标识，小写拼音/英文加连字符，如 `campus-daily-01` |
| `date` | 是 | 日期，`YYYY-MM-DD` |
| `category` | 是 | 栏目，取值见下表 |
| `author` | 是 | 署名，可用笔名 |
| `cover` | 否 | 题图路径（后台上传后自动填） |
| `excerpt` | 否 | 摘要一句话，留空自动截取正文 |
| `draft` | 否 | `true` 时只在 `npm run dev` 下可见，线上隐藏 |

栏目取值：`campus` 校园 / `people` 人物 / `opinion` 评论 / `culture` 副刊 / `photo` 图集。

## 内容后台首次配置

后台是纯静态的 Sveltia CMS（已就地化到 `public/admin/vendor/`，界面、语言包、字体全部走站内，不依赖境外 CDN），登录用 GitHub OAuth，需要一个配套的 GitHub OAuth App：

1. 把本项目推到 GitHub 仓库（默认分支 `main`）。
2. 编辑 `public/admin/config.yml`：
   - `backend.repo` 改成 `你的用户名/仓库名`；
   - `base_url` 和 `site_url` 里的 `https://EXAMPLE.vercel.app` 改成正式域名（`base_url` 记得保留 `/api` 后缀）。
3. 打开 GitHub → Settings → Developer settings → OAuth Apps → New OAuth App：
   - Homepage URL：`https://你的域名`
   - Authorization callback URL：`https://你的域名/api/callback`
   创建后记下 Client ID，并生成一个 Client Secret。
4. 在 Vercel 项目 → Settings → Environment Variables 里添加：
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - 可选 `ALLOWED_DOMAINS`（允许发起登录的域名，逗号分隔；不填只信任当前域名）
   - 可选 `NEXT_PUBLIC_SITE_URL`（正式域名，用于 RSS 和分享卡片）
   保存后 Redeploy 一次。
5. 编辑部想用后台的同学，需要先被邀请为这个仓库的 Collaborator（要有写权限），然后打开 `https://你的域名/admin/` 用 GitHub 登录即可。

> 后台登录的本质是「以你的 GitHub 身份往仓库提交文件」，所以权限管理就在 GitHub 仓库的 Collaborator 里做。

> 不想配 OAuth App 的话，也可以直接在后台选「使用访问令牌登录」：在 GitHub 生成一个 fine-grained token（权限勾 `Contents: Read and write`），粘贴进去即可。这种方式适合临时使用，正式上线建议还是配好 OAuth。

## 部署到 Vercel

1. GitHub 上新建仓库，把本项目推送上去。
2. 打开 vercel.com → Add New → Project，选择该仓库，框架会自动识别 Next.js，直接部署。
3. 按上一节配置环境变量；如果要自定义域名，在 Vercel 的 Domains 里绑定，再把 OAuth App 的 callback 和 `config.yml` 里的域名一起更新。
4. 之后每次在后台保存文章，都会自动触发一次部署，大约一分钟上线。

命令行方式（可选）：`npx vercel login` 后执行 `npx vercel --prod`。

## 账号与投稿

访问者可以在 `/register` 用「昵称 + 邮箱 + 密码」注册，登录后在 `/submit` 投稿；稿件先进入待审状态，管理员在 `/review` 审核：

- **通过并发布**：稿件会生成 Markdown 文件提交到本仓库的 `content/posts/`（部署环境通过 `GITHUB_TOKEN` 提交，触发 Vercel 自动重新部署，约 1 分钟后上线）。
- **退回**：可以填写退回原因，作者在「我的投稿」里能看到。

页面一览：`/register` 注册 · `/login` 登录 · `/submit` 投稿 · `/my` 我的投稿 · `/review` 审核（仅管理员）。

已发布稿件可在 `/my` 的「修改分区」进入 `/manage` 调整栏目；管理员也能在 `/review` 进入该页，调整所有已发布文章的分区。

需要新增的环境变量（Vercel → Settings → Environment Variables）：

| 变量 | 说明 |
| --- | --- |
| `AUTH_SECRET` | 登录会话签名密钥，填一段随机长字符串（本地开发可不填） |
| `ADMIN_EMAILS` | 管理员邮箱，逗号分隔；只有这些账号能进入审核页 |
| `ADMIN_EMAILS_EXTRA` | 可追加管理员邮箱，逗号分隔；不会覆盖 `ADMIN_EMAILS` |
| `BLOB_READ_WRITE_TOKEN` | 图片对象存储令牌；用于头像、题图和其他上传图片 |
| `TURSO_DATABASE_URL` | libSQL/Turso 数据库地址，存放账号、投稿和评论 |
| `TURSO_AUTH_TOKEN` | libSQL/Turso 数据库访问令牌 |
| `GITHUB_TOKEN` | 细粒度令牌，仓库 Contents 读写权限，用于发布稿件 |
| `GITHUB_REPO` | 仓库，如 `owner/repo` |
| `GITHUB_BRANCH` | 可选，默认 `main` |

本机开发不需要任何云服务：结构化数据存在 `.tmp/wenwen.sqlite`，上传图片存在 `.tmp/store/`，审核通过的文章会直接写进 `content/posts/`，重新构建即可看到。`BLOB_READ_WRITE_TOKEN` 现在只用于图片，不再保存账号、投稿或评论。

注意事项：

- 注册没有邮件验证和验证码；公开上线后如果被恶意注册，可以再加邀请码或邮箱验证。
- 用户数据存放在 Vercel Blob（路径随机不可猜，但存储桶是公开读的）；要更强隐私可以升级为数据库方案。

## 常用脚本

```bash
npm run assets      # 重新生成 public/media 图片（改素材后执行）
npm run vendor:cms  # 升级 @sveltia/cms 后，重新就地化后台文件
npm run blob:export -- .tmp/blob-export  # 导出旧 Vercel Blob 数据
npm run db:migrate -- .tmp/blob-export   # 将导出的数据导入 libSQL/SQLite
```

## 从 Vercel Blob 迁移数据

1. 设置 `BLOB_READ_WRITE_TOKEN` 后运行 `npm run blob:export -- .tmp/blob-export`。
2. 创建 Turso 数据库，配置 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN`。
3. 运行 `npm run db:migrate -- .tmp/blob-export`。
4. 若新部署使用本地持久磁盘而不是 Blob，再以 `REWRITE_MEDIA_URLS=1` 重新迁移，把图片地址改写为 `/api/blob/...`。

旧 Blob 中的图片可以在解封期间正常读取，但新 Vercel 项目应使用新的 Blob 存储或持久磁盘。

## 几个约定

- 文章 URL 是 `/posts/<slug>`，栏目页是 `/sections/<category>`。
- 栏目列表在两处定义，需要同步修改：`src/lib/categories.ts` 和 `public/admin/config.yml`。
- 期号、页脚说明、素材授权说明在 `content/settings/site.yml`（后台「站点设置」里可直接改）。
- 图片建议上传 1600 像素以内、JPG/PNG/WebP 格式（HEIC 等格式依赖境外 CDN 解码，可能不可用）。
- 素材授权与来源见 `CREDITS.md`。
