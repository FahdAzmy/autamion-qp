"use client";

import { FormEvent, useState } from "react";

type UploadResult = {
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ rowNumber: number; message: string }>;
};

export function ExcelUploadForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const body = await response.json();

    setLoading(false);

    if (!response.ok) {
      setError(body.error?.message ?? body.error ?? "Upload failed.");
      return;
    }

    setResult(body);
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={onSubmit} className="grid gap-4 rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
        <label className="grid gap-2 text-sm font-medium">
          Excel file
          <input
            name="file"
            type="file"
            accept=".xlsx"
            required
            className="rounded-md border border-[var(--line)] bg-background px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-fit rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          {loading ? "Importing..." : "Upload and create orders"}
        </button>
      </form>

      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {result && (
        <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="text-lg font-semibold">Import result</h2>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div>
              <dt className="text-[var(--muted)]">Total rows</dt>
              <dd className="font-mono text-xl font-semibold">{result.totalRows}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Created</dt>
              <dd className="font-mono text-xl font-semibold text-[var(--accent)]">{result.successCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Failed</dt>
              <dd className="font-mono text-xl font-semibold text-[var(--danger)]">{result.failedCount}</dd>
            </div>
          </dl>
          {result.errors.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
                    <th className="py-2 pr-3">Row</th>
                    <th className="py-2 pr-3">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((item, index) => (
                    <tr key={`${item.rowNumber}-${index}`} className="border-b border-[var(--line)]">
                      <td className="py-2 pr-3 font-mono">{item.rowNumber}</td>
                      <td className="py-2 pr-3">{item.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
