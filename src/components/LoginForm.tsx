"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";

type State = { error?: string };

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<State, FormData>(loginAction, {});

  return (
    <form action={formAction} className="form">
      {state.error ? <p className="alert alert-error">{state.error}</p> : null}
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="login-email">邮箱</label>
        <input
          id="login-email"
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="login-password">密码</label>
        <input
          id="login-password"
          className="input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
