import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "登录",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/my");
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/my";

  return (
    <div className="auth-card">
      <h1 className="section-title">登录</h1>
      <p className="auth-note">登录后可以投稿，并在「我的投稿」里查看审核进度。</p>
      <LoginForm next={next} />
      <p className="auth-alt">
        还没有账号？<Link href="/register">去注册</Link>
      </p>
    </div>
  );
}
