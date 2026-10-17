import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { getSessionUser } from "@/lib/auth";
import { findUserById } from "@/lib/users";

export const metadata: Metadata = {
  title: "个人资料",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=/profile");
  const user = await findUserById(session.id);
  if (!user) redirect("/login");

  return (
    <div className="page-narrow">
      <h1 className="section-title">个人资料</h1>
      <ProfileForm
        user={{
          name: user.name,
          email: user.email,
          bio: user.bio ?? "",
          avatar: user.avatar ?? null,
        }}
      />
      <p className="profile-links">
        <Link href="/my">我的投稿</Link>
        <Link href="/submit">写新投稿</Link>
      </p>
    </div>
  );
}
