import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReviewActions from "@/components/ReviewActions";
import { getSessionUser, isAdminEmail } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import { renderMarkdown } from "@/lib/markdown";
import { listSubmissions, type SubmissionStatus } from "@/lib/submissions";

export const metadata: Metadata = {
  title: "投稿审核",
};

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending: "待审核",
  approved: "已发布",
  rejected: "未通过",
};

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(iso));

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; slug?: string; detail?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/review");
  if (!isAdminEmail(user.email)) notFound();

  const params = await searchParams;
  const submissions = await listSubmissions();
  const pending = submissions.filter((item) => item.status === "pending");
  const processed = submissions.filter((item) => item.status !== "pending").slice(0, 20);
  const previews = await Promise.all(pending.map((item) => renderMarkdown(item.contentMd)));

  return (
    <div className="page-narrow page-narrow-wide">
      <div className="page-head">
        <h1 className="section-title">投稿审核</h1>
        <div className="page-head-actions">
          <Link className="btn btn-ghost btn-sm" href="/manage">
            修改已发布文章分区
          </Link>
        </div>
      </div>
      <p className="auth-note">
        通过后会生成文章并提交到仓库，部署环境会自动重新构建，约 1 分钟后上线。
      </p>
      <p className="review-rules">
        审核要点：原创、非 AI 批量生成；无违法违规、人身攻击、隐私泄露和广告内容。一稿多投或已在其他平台发布的稿件请退回。
      </p>
      {params.msg === "published" ? (
        <p className="alert alert-ok">
          已通过并提交发布。{params.slug ? <Link href={`/posts/${params.slug}`}>查看文章 →</Link> : null}
        </p>
      ) : null}
      {params.msg === "rejected" ? <p className="alert alert-ok">已退回这篇投稿。</p> : null}
      {params.msg === "missing" ? (
        <p className="alert alert-error">这篇投稿不存在，或者已经被处理过了。</p>
      ) : null}
      {params.msg === "error" ? (
        <p className="alert alert-error">发布失败：{params.detail ?? "未知错误"}</p>
      ) : null}

      {pending.length === 0 ? (
        <p className="empty-note">没有待审核的投稿。</p>
      ) : (
        <ul className="sub-list">
          {pending.map((item, index) => (
            <li className="sub-item" key={item.id}>
              <div className="sub-head">
                <h2 className="sub-title">{item.title}</h2>
                <span className="chip chip-pending">待审核</span>
              </div>
              <p className="sub-meta">
                {item.authorName}（{item.authorEmail}） · {categoryName(item.category)} ·{" "}
                {formatTime(item.createdAt)}
              </p>
              {item.coverUrl ? <img className="sub-cover" src={item.coverUrl} alt="" /> : null}
              <details className="preview-toggle">
                <summary>预览正文</summary>
                <div className="prose review-preview" dangerouslySetInnerHTML={{ __html: previews[index] }} />
              </details>
              <ReviewActions id={item.id} />
            </li>
          ))}
        </ul>
      )}

      {processed.length > 0 ? (
        <>
          <h2 className="review-heading">最近处理</h2>
          <ul className="sub-list">
            {processed.map((item) => (
              <li className="sub-item" key={item.id}>
                <div className="sub-head">
                  <h2 className="sub-title">{item.title}</h2>
                  <span className={item.status === "approved" ? "chip chip-approved" : "chip chip-rejected"}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                <p className="sub-meta">
                  {item.authorName} · {formatTime(item.reviewedAt ?? item.createdAt)}
                  {item.status === "approved" && item.publishedSlug ? (
                    <>
                      {" · "}
                      <Link href={`/posts/${item.publishedSlug}`}>查看文章</Link>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
