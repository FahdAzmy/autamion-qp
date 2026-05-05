"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SyncSummary = {
  checked?: number;
  updated?: number;
  unchanged?: number;
  skipped?: number;
  failed?: number;
  errors?: Array<{
    orderId?: string;
    referenceID?: string;
    qpSerial?: string | number;
    error?: { message?: string; response?: unknown } | string;
  }>;
  error?: { message?: string } | string;
};

function errorMessage(body: SyncSummary) {
  if (typeof body.error === "string") return body.error;
  return body.error?.message ?? "Sync failed.";
}

export function OrdersSyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<NonNullable<SyncSummary["errors"]>>([]);

  async function syncOrders() {
    setLoading(true);
    setMessage("");
    setErrors([]);

    const response = await fetch("/api/orders/sync", { method: "POST" });
    const body = (await response.json().catch(() => ({}))) as SyncSummary;

    setLoading(false);
    console.info("Orders sync response", body);

    if (!response.ok) {
      console.error("Orders sync request failed", body);
      setMessage(errorMessage(body));
      return;
    }

    if ((body.errors?.length ?? 0) > 0) {
      console.error("Orders sync order errors", body.errors);
      setErrors(body.errors ?? []);
    }

    setMessage(
      `Checked ${body.checked ?? 0}. Updated ${body.updated ?? 0}. Unchanged ${body.unchanged ?? 0}. Skipped ${
        body.skipped ?? 0
      }. Failed ${body.failed ?? 0}.`,
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={syncOrders}
        disabled={loading}
        className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Syncing..." : "Sync"}
      </button>
      {message && <p className="max-w-sm text-xs text-[var(--muted)]">{message}</p>}
      {errors.length > 0 && (
        <div className="max-w-xl rounded-md border border-red-200 bg-red-50 p-3 text-left text-xs text-red-900">
          <p className="font-semibold">Sync errors</p>
          <ul className="mt-2 grid gap-2">
            {errors.slice(0, 5).map((entry) => (
              <li key={`${entry.orderId ?? entry.referenceID ?? entry.qpSerial}`}>
                <span className="font-mono">{entry.referenceID ?? entry.qpSerial ?? entry.orderId ?? "Order"}</span>
                {": "}
                {typeof entry.error === "string" ? entry.error : entry.error?.message ?? "Unknown error"}
              </li>
            ))}
          </ul>
          {errors.length > 5 && <p className="mt-2">Open the browser console to see all {errors.length} errors.</p>}
        </div>
      )}
    </div>
  );
}
