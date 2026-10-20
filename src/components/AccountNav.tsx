"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import UserAvatar from "@/components/UserAvatar";

type SessionInfo = {
  name: string;
  email: string;
  isAdmin: boolean;
  avatar?: string | null;
};

export default function AccountNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user: SessionInfo | null }) => {
        setUser(data.user);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("account:refresh", refresh);
    return () => window.removeEventListener("account:refresh", refresh);
  }, [load]);

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }, []);

  if (!loaded || !user) {
    return (
      <div className="account-nav">
        <Link href="/submit">投稿</Link>
        <Link href="/login">登录</Link>
      </div>
    );
  }

  return (
    <div className="account-nav">
      <Link href="/submit">投稿</Link>
      <Link href="/my">我的</Link>
      {user.isAdmin ? <Link href="/review">审稿</Link> : null}
      {user.isAdmin ? (
        <Link href="/manage" title="修改已发布文章的分区">
          修改分区
        </Link>
      ) : null}
      <Link className="account-user" href="/profile" aria-label="个人资料">
        <UserAvatar name={user.name} avatar={user.avatar} size={22} />
        <span className="account-user-name">{user.name}</span>
      </Link>
      <button type="button" className="link-btn" onClick={logout}>
        退出
      </button>
    </div>
  );
}
