"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type SessionInfo = {
  name: string;
  email: string;
  isAdmin: boolean;
};

export default function AccountNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user: SessionInfo | null }) => {
        if (!cancelled) {
          setUser(data.user);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

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
      <button type="button" className="link-btn" onClick={logout}>
        退出
      </button>
    </div>
  );
}
