import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SectionEditForm from "@/components/SectionEditForm";
import { getSessionUser, isAdminEmail } from "@/lib/auth";
import { CATEGORIES, categoryName, isCategory } from "@/lib/categories";
import { formatDate, getAllPosts } from "@/lib/posts";
import { listSubmissions } from "@/lib/submissions";

export const metadata: Metadata = {
  title: "修改文章分区",
};

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; slug?: string; category?: string; detail?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/manage");

  const params = await searchParams;
  const admin = isAdminEmail(user.email);
  const submissions = await listSubmissions();
  const ownedSlugs = new Set(
    submissions
      .filter((item) => item.status === "approved" && item.authorId === user.id && item.publishedSlug)
      .map((item) => item.publishedSlug as string),
  );
  const posts = getAllPosts()
    .filter((post) => !post.draft && (admin || ownedSlugs.has(post.slug)))
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "zh-CN"));
  const updatedPost = params.slug ? posts.find((post) => post.slug === params.slug) : undefined;

  return (
    <div className="page-narrow page-narrow-wide manage-page">
      <div className="page-head">
        <h1 className="section-title">修改文章分区</h1>
        <div className="page-head-actions">
          <Link className="btn btn-ghost btn-sm" href={admin ? "/review" : "/my"}>
            {admin ? "返回审核" : "返回我的投稿"}
          </Link>
        </div>
      </div>
      <p className="auth-note">
        {admin
          ? "管理员可以调整所有已发布文章的分区。"
          : "你可以调整自己经审核发布的文章分区。"}
      </p>

      {params.msg === "updated" ? (
        <p className="alert alert-ok">
          分区已提交更新
          {params.category && isCategory(params.category)
            ? `为「${categoryName(params.category)}」`
            : ""}
          ，线上部署环境约 1 分钟后生效。
          {updatedPost ? <Link href={`/posts/${updatedPost.slug}`}>查看文章 →</Link> : null}
        </p>
      ) : null}
      {params.msg === "same" ? <p className="alert alert-ok">分区没有变化。</p> : null}
      {params.msg === "forbidden" ? (
        <p className="alert alert-error">你没有权限修改这篇文章。</p>
      ) : null}
      {params.msg === "missing" ? (
        <p className="alert alert-error">文章不存在或已经下线。</p>
      ) : null}
      {params.msg === "invalid" ? <p className="alert alert-error">请选择有效分区。</p> : null}
      {params.msg === "error" ? (
        <p className="alert alert-error">修改失败：{params.detail ?? "未知错误"}</p>
      ) : null}

      {posts.length === 0 ? (
        <p className="empty-note">
          暂无可修改的已发布文章。
          {admin ? null : <Link href="/submit"> 去投稿</Link>}
        </p>
      ) : (
        <ul className="sub-list">
          {posts.map((post) => (
            <li className="sub-item manage-item" id={`post-${post.slug}`} key={post.slug}>
              <div className="sub-head">
                <h2 className="sub-title">{post.title}</h2>
                <span className="chip manage-current">{categoryName(post.category)}</span>
              </div>
              <p className="sub-meta">
                {post.author} · {formatDate(post.date)} ·{" "}
                <Link href={`/posts/${post.slug}`}>查看文章</Link>
              </p>
              <SectionEditForm
                slug={post.slug}
                title={post.title}
                category={post.category}
                categories={CATEGORIES}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
