"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { approveAction, rejectAction } from "@/lib/actions";

type PendingAction = "approve" | "reject" | null;

export default function ReviewActions({ id }: { id: string }) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const locked = useRef(false);

  const guard = (action: Exclude<PendingAction, null>) => (event: FormEvent<HTMLFormElement>) => {
    if (locked.current) {
      event.preventDefault();
      return;
    }
    locked.current = true;
    setPendingAction(action);
  };

  return (
    <div className="review-actions" aria-busy={pendingAction !== null}>
      <form action={approveAction} onSubmit={guard("approve")}>
        <input type="hidden" name="id" value={id} />
        <button className="btn btn-primary" type="submit" disabled={pendingAction !== null}>
          {pendingAction === "approve" ? "发布中…" : "通过并发布"}
        </button>
      </form>
      <form action={rejectAction} className="reject-form" onSubmit={guard("reject")}>
        <input type="hidden" name="id" value={id} />
        <input className="input" name="note" maxLength={200} placeholder="退回原因（可选，作者可见）" />
        <button className="btn btn-ghost" type="submit" disabled={pendingAction !== null}>
          {pendingAction === "reject" ? "退回中…" : "退回"}
        </button>
      </form>
    </div>
  );
}
