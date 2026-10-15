"use client";

import { useActionState } from "react";
import { registerAction } from "@/lib/actions";

type State = { error?: string };

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(registerAction, {});

  return (
    <form action={formAction} className="form">
      {state.error ? <p className="alert alert-error">{state.error}</p> : null}
      <div className="field">
        <label htmlFor="register-name">昵称</label>
        <input
          id="register-name"
          className="input"
          type="text"
          name="name"
          maxLength={24}
          autoComplete="nickname"
          required
        />
        <span className="hint">投稿时会作为默认署名，之后可以改。</span>
      </div>
      <div className="field">
        <label htmlFor="register-email">邮箱</label>
        <input
          id="register-email"
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="register-password">密码</label>
        <input
          id="register-password"
          className="input"
          type="password"
          name="password"
          minLength={8}
          autoComplete="new-password"
          required
        />
        <span className="hint">至少 8 位。</span>
      </div>
      <div className="field">
        <label htmlFor="register-password2">确认密码</label>
        <input
          id="register-password2"
          className="input"
          type="password"
          name="password2"
          minLength={8}
          autoComplete="new-password"
          required
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "创建中…" : "创建账户"}
      </button>
    </form>
  );
}
