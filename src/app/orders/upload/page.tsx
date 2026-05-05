import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { ExcelUploadForm } from "@/components/ExcelUploadForm";

export default function UploadPage() {
  return (
    <AdminShell>
      <div className="mb-6">
        <Link href="/orders" className="text-sm font-semibold text-[var(--accent)]">
          Back to orders
        </Link>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Excel upload</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Upload `.xlsx` files. Rows are processed synchronously and QP failures stay available
          for manual retry.
        </p>
      </div>
      <ExcelUploadForm />
    </AdminShell>
  );
}
