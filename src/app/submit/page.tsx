import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SubmitForm from "@/components/SubmitForm";
import { getSessionUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = {
  title: "投稿",
};

export default async function SubmitPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/submit");

  return (
    <div className="page-narrow page-narrow-wide">
      <h1 className="section-title">投稿</h1>
      <p className="auth-note">投稿会先交给编辑部审核，通过后发布在站上。正文支持 Markdown。</p>
      <section className="guidelines" aria-label="投稿须知">
        <h2>投稿须知</h2>
        <ul>
          <li>只接收原创稿件，请勿一稿多投或在其他平台二次发布。</li>
          <li>禁止使用 AI 批量生成内容刷屏。</li>
          <li>不接收违法违规、色情暴力、人身攻击、隐私泄露、广告和抄袭内容。</li>
          <li>编辑部会审核来稿，可能退回修改；通过后才会发布。</li>
        </ul>
      </section>
      <SubmitForm categories={CATEGORIES} defaultAuthor={user.name} />
    </div>
  );
}
