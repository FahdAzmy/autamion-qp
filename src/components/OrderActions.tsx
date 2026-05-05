"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderActions({ orderId, canRetry }: { orderId: string; canRetry: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");

  async function runAction(action: "sync" | "retry" | "delete") {
    setLoading(action);
    setMessage("");

    const url = action === "delete" ? `/api/orders/${orderId}` : `/api/orders/${orderId}/${action}`;
    const response = await fetch(url, { method: action === "delete" ? "DELETE" : "POST" });
    const body = await response.json();

    setLoading("");

    if (!response.ok) {
      setMessage(body.error?.message ?? body.error ?? `${action} failed.`);
      return;
    }

    if (action === "delete") {
      router.push("/orders");
      return;
    }

    setMessage(`${action === "sync" ? "Sync" : "Retry"} complete.`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => runAction("sync")}
        disabled={loading !== ""}
        className="rounded-md border border-[var(--line)] px-3 py-2 text-sm font-medium hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
      >
        {loading === "sync" ? "Syncing..." : "Sync status"}
      </button>
      {canRetry && (
        <button
          type="button"
          onClick={() => runAction("retry")}
          disabled={loading !== ""}
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm font-medium hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
        >
          {loading === "retry" ? "Retrying..." : "Retry QP send"}
        </button>
      )}
      <button
        type="button"
        onClick={() => runAction("delete")}
        disabled={loading !== ""}
        className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-[var(--danger)] hover:bg-red-50 disabled:opacity-60"
      >
        {loading === "delete" ? "Deleting..." : "Soft delete"}
      </button>
      {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
