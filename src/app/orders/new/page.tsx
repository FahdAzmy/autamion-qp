import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { ManualOrderForm } from "@/components/ManualOrderForm";

export default function NewOrderPage() {
  return (
    <AdminShell>
      <div className="mb-6">
        <Link href="/orders" className="text-sm font-semibold text-[var(--accent)]">
          Back to orders
        </Link>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Create manual order</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Saves the local order first, then sends it to QP Express in the same request.
        </p>
      </div>
      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
        <ManualOrderForm />
      </section>
    </AdminShell>
  );
}
