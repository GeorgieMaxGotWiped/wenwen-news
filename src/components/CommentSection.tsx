"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import { commentAction } from "@/lib/actions";

type CommentView = {
  id: string;
  name: string;
  avatar: string | null;
  body: string;
  createdAt: string;
};

type SessionInfo = { name: string; avatar?: string | null } | null;

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(iso));

export default function CommentSection({ slug }: { slug: string }) {
  const [comments, setComments] = useState<CommentView[] | null>(null);
  const [user, setUser] = useState<SessionInfo | undefined>(undefined);
  const [state, formAction, pending] = useActionState(commentAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    try {
      const [commentsResponse, sessionResponse] = await Promise.all([
        fetch(`/api/comments?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }),
        fetch("/api/session", { cache: "no-store" }),
      ]);
      const commentsData = (await commentsResponse.json()) as { comments?: CommentView[] };
      const sessionData = (await sessionResponse.json()) as { user?: SessionInfo };
      setComments(Array.isArray(commentsData.comments) ? commentsData.comments : []);
      setUser(sessionData.user ?? null);
    } catch {
      setComments([]);
      setUser(null);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    load();
  }, [state, load]);

  return (
    <section className="comment-section" aria-label="评论区">
      <h2 className="kicker">
        评论
        {comments && comments.length > 0 ? <span className="comment-count">{comments.length}</span> : null}
      </h2>

      {user === undefined ? null : user ? (
        <form ref={formRef} action={formAction} className="comment-form">
          <input type="hidden" name="postSlug" value={slug} />
          <textarea
            className="textarea comment-input"
            name="body"
            rows={3}
            maxLength={800}
            required
            placeholder="写下你的评论……"
          />
          {state.error ? <p className="alert alert-error">{state.error}</p> : null}
          <div className="comment-actions">
            <button className="btn btn-primary btn-sm" type="submit" disabled={pending}>
              {pending ? "发布中…" : "发表评论"}
            </button>
          </div>
        </form>
      ) : (
        <p className="comment-login">
          <Link href={`/login?next=/posts/${slug}`}>登录</Link> 后参与评论。
        </p>
      )}

      {comments === null ? (
        <p className="comment-empty">评论加载中…</p>
      ) : comments.length === 0 ? (
        <p className="comment-empty">还没有评论。</p>
      ) : (
        <ul className="comment-list">
          {comments.map((comment) => (
            <li className="comment" key={comment.id}>
              <UserAvatar name={comment.name} avatar={comment.avatar} size={34} />
              <div className="comment-body">
                <div className="comment-head">
                  <span className="comment-name">{comment.name}</span>
                  <time className="comment-time" dateTime={comment.createdAt}>
                    {formatTime(comment.createdAt)}
                  </time>
                </div>
                <p className="comment-text">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
