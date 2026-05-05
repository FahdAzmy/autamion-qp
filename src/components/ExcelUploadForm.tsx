"use client";

import { FormEvent, useState } from "react";

type UploadResult = {
  productName?: string;
  exceptProductName?: string;
  totalRows: number;
  matchedRows?: number;
  skippedRows?: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ rowNumber: number; message: string }>;
};

function resultColumns(result: UploadResult) {
  if (typeof result.matchedRows === "number") return "md:grid-cols-5";
  if (typeof result.skippedRows === "number") return "md:grid-cols-4";
  return "md:grid-cols-3";
}

function ImportResult({ result, title }: { result: UploadResult; title: string }) {
  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {result.productName && (
          <p className="text-sm text-[var(--muted)]" dir="auto">
            {result.productName}
          </p>
        )}
        {result.exceptProductName && (
          <p className="text-sm text-[var(--muted)]" dir="auto">
            Except: {result.exceptProductName}
          </p>
        )}
      </div>
      <dl className={`mt-4 grid gap-3 text-sm ${resultColumns(result)}`}>
        <div>
          <dt className="text-[var(--muted)]">Total rows</dt>
          <dd className="font-mono text-xl font-semibold">{result.totalRows}</dd>
        </div>
        {typeof result.matchedRows === "number" && (
          <div>
            <dt className="text-[var(--muted)]">Matched</dt>
            <dd className="font-mono text-xl font-semibold text-[var(--accent)]">{result.matchedRows}</dd>
          </div>
        )}
        {typeof result.skippedRows === "number" && (
          <div>
            <dt className="text-[var(--muted)]">Skipped</dt>
            <dd className="font-mono text-xl font-semibold">{result.skippedRows}</dd>
          </div>
        )}
        <div>
          <dt className="text-[var(--muted)]">Created</dt>
          <dd className="font-mono text-xl font-semibold text-[var(--accent)]">{result.successCount}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Failed</dt>
          <dd className="font-mono text-xl font-semibold text-[var(--danger)]">{result.failedCount}</dd>
        </div>
      </dl>
      {result.matchedRows === 0 && (
        <p className="mt-5 rounded-md border border-[var(--line)] bg-background p-3 text-sm text-[var(--muted)]">
          No rows matched this product name.
        </p>
      )}
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
  );
}

export function ExcelUploadForm() {
  const [fullLoading, setFullLoading] = useState(false);
  const [fullResult, setFullResult] = useState<UploadResult | null>(null);
  const [fullError, setFullError] = useState("");
  const [filteredLoading, setFilteredLoading] = useState(false);
  const [filteredResult, setFilteredResult] = useState<UploadResult | null>(null);
  const [filteredError, setFilteredError] = useState("");

  async function submitUpload(
    event: FormEvent<HTMLFormElement>,
    endpoint: string,
    setLoading: (loading: boolean) => void,
    setResult: (result: UploadResult | null) => void,
    setError: (error: string) => void,
  ) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(endpoint, {
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
      <form
        onSubmit={(event) => submitUpload(event, "/api/upload", setFullLoading, setFullResult, setFullError)}
        className="grid gap-4 rounded-md border border-[var(--line)] bg-[var(--panel)] p-5"
      >
        <div>
          <h2 className="text-lg font-semibold">Import entire Excel file</h2>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          Except product name
          <input
            name="exceptProductName"
            type="text"
            dir="auto"
            placeholder="Leave empty to import all orders"
            className="rounded-md border border-[var(--line)] bg-background px-3 py-2"
          />
        </label>
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
          disabled={fullLoading}
          className="w-fit rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          {fullLoading ? "Importing..." : "Upload and create orders"}
        </button>
      </form>

      {fullError && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{fullError}</p>}

      {fullResult && <ImportResult result={fullResult} title="Import result" />}

      <form
        onSubmit={(event) =>
          submitUpload(event, "/api/upload/filter", setFilteredLoading, setFilteredResult, setFilteredError)
        }
        className="grid gap-4 rounded-md border border-[var(--line)] bg-[var(--panel)] p-5"
      >
        <div>
          <h2 className="text-lg font-semibold">Import by product name</h2>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          Product name
          <input
            name="productName"
            type="text"
            required
            dir="auto"
            placeholder="linen trousers"
            className="rounded-md border border-[var(--line)] bg-background px-3 py-2"
          />
        </label>
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
          disabled={filteredLoading}
          className="w-fit rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-background transition hover:opacity-85 disabled:opacity-60"
        >
          {filteredLoading ? "Searching and importing..." : "Import matching orders"}
        </button>
      </form>

      {filteredError && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{filteredError}</p>
      )}

      {filteredResult && <ImportResult result={filteredResult} title="Filtered import result" />}
    </div>
  );
}
