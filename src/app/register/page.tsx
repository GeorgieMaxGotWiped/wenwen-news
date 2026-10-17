import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import RegisterForm from "@/components/RegisterForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "注册",
};

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/my");

  return (
    <div className="auth-card">
      <h1 className="section-title">注册</h1>
      <p className="auth-note">
        填好昵称、邮箱和密码就能开始投稿。投稿须为原创，禁止 AI 刷屏和违规内容；稿件通过编辑部审核后才会发布。
      </p>
      <RegisterForm />
      <p className="auth-alt">
        已经有账号？<Link href="/login">去登录</Link>
      </p>
    </div>
  );
}
