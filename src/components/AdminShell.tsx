import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/orders", label: "Orders" },
  { href: "/orders/new", label: "Create Order" },
  { href: "/orders/upload", label: "Excel Upload" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
              QP Express
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Orders Admin</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-[var(--line)] px-3 py-2 text-sm font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-6">{children}</main>
    </div>
  );
}
