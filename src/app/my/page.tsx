import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import { categoryName } from "@/lib/categories";
import { listSubmissions, type SubmissionStatus } from "@/lib/submissions";

export const metadata: Metadata = {
  title: "我的投稿",
};

const STATUS: Record<SubmissionStatus, { label: string; className: string }> = {
  pending: { label: "待审核", className: "chip chip-pending" },
  approved: { label: "已发布", className: "chip chip-approved" },
  rejected: { label: "未通过", className: "chip chip-rejected" },
};

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(iso));

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/my");
  const params = await searchParams;
  const submissions = (await listSubmissions()).filter((item) => item.authorId === user.id);

  return (
    <div className="page-narrow">
      <div className="page-head">
        <h1 className="section-title">我的投稿</h1>
        <div className="page-head-actions">
          <Link className="btn btn-ghost btn-sm" href="/profile">
            个人资料
          </Link>
          <form action={logoutAction}>
            <button className="btn btn-ghost btn-sm" type="submit">
              退出登录
            </button>
          </form>
        </div>
      </div>
      {params.ok ? (
        <p className="alert alert-ok">投稿已提交，等待编辑部审核。通过后会出现在站上。</p>
      ) : null}
      {submissions.length === 0 ? (
        <p className="empty-note">
          还没有投稿，<Link href="/submit">去写一篇</Link>。
        </p>
      ) : (
        <ul className="sub-list">
          {submissions.map((item) => {
            const status = STATUS[item.status] ?? STATUS.pending;
            return (
              <li className="sub-item" key={item.id}>
                <div className="sub-head">
                  <h2 className="sub-title">{item.title}</h2>
                  <span className={status.className}>{status.label}</span>
                </div>
                <p className="sub-meta">
                  {categoryName(item.category)} · 提交于 {formatTime(item.createdAt)}
                </p>
                {item.reviewNote ? <p className="sub-note">审核意见：{item.reviewNote}</p> : null}
                {item.status === "approved" && item.publishedSlug ? (
                  <p className="sub-note">
                    <Link href={`/posts/${item.publishedSlug}`}>查看文章 →</Link>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
