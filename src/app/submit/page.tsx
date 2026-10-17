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
      <SubmitForm categories={CATEGORIES} defaultAuthor={user.name} />
    </div>
  );
}
