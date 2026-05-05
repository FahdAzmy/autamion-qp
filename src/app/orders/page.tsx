import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { OrdersSyncButton } from "@/components/OrdersSyncButton";
import { SetupNotice } from "@/components/SetupNotice";
import { StatusBadge } from "@/components/StatusBadge";
import { listOrders, normalizeError, serializeOrder } from "@/server/services/orders";

export const dynamic = "force-dynamic";

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toUrlSearchParams(params: Record<string, string | string[] | undefined>) {
  const urlSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => urlSearchParams.append(key, entry));
    } else if (value) {
      urlSearchParams.set(key, value);
    }
  }

  return urlSearchParams;
}

function firstParam(params: URLSearchParams, key: string) {
  return params.get(key) ?? "";
}

function pageHref(params: URLSearchParams, page: number) {
  const nextParams = new URLSearchParams(params);

  if (page <= 1) {
    nextParams.delete("page");
  } else {
    nextParams.set("page", String(page));
  }

  const query = nextParams.toString();
  return query ? `/orders?${query}` : "/orders";
}

function pageItems(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  const visiblePages = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: Array<number | "gap"> = [];

  for (const page of visiblePages) {
    const previous = items.at(-1);

    if (typeof previous === "number" && page - previous > 1) {
      items.push("gap");
    }

    items.push(page);
  }

  return items;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = toUrlSearchParams(await searchParams);
  let setupMessage = "";
  let result: Awaited<ReturnType<typeof listOrders>> | null = null;

  try {
    result = await listOrders(params);
  } catch (error) {
    setupMessage = normalizeError(error).message;
  }

  const orders = result?.items.map(serializeOrder) ?? [];

  return (
    <AdminShell>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent)]">Operations</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Orders</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Local MongoDB orders with QP serials, status, and manual retry/sync controls.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <OrdersSyncButton />
          <Link
            href="/orders/new"
            className="w-fit rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          >
            Create order
          </Link>
        </div>
      </div>
      {setupMessage ? (
        <SetupNotice message={setupMessage} />
      ) : (
        <div className="grid gap-5">
          <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
            <form className="grid gap-3 md:grid-cols-8">
              <input
                name="status"
                placeholder="Status code"
                defaultValue={firstParam(params, "status")}
                className="rounded-md border border-[var(--line)] bg-background px-3 py-2 text-sm"
              />
              <input
                name="phone"
                placeholder="Phone"
                defaultValue={firstParam(params, "phone")}
                className="rounded-md border border-[var(--line)] bg-background px-3 py-2 text-sm"
              />
              <input
                name="name"
                placeholder="Name"
                defaultValue={firstParam(params, "name")}
                className="rounded-md border border-[var(--line)] bg-background px-3 py-2 text-sm"
              />
              <input
                name="city"
                placeholder="City"
                defaultValue={firstParam(params, "city")}
                className="rounded-md border border-[var(--line)] bg-background px-3 py-2 text-sm"
              />
              <input
                name="fromDate"
                type="date"
                defaultValue={firstParam(params, "fromDate")}
                className="rounded-md border border-[var(--line)] bg-background px-3 py-2 text-sm"
              />
              <input
                name="referenceID"
                placeholder="Reference ID"
                defaultValue={firstParam(params, "referenceID")}
                className="rounded-md border border-[var(--line)] bg-background px-3 py-2 text-sm"
              />
              <select
                name="pageSize"
                defaultValue={firstParam(params, "pageSize") || "25"}
                className="rounded-md border border-[var(--line)] bg-background px-3 py-2 text-sm"
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
              <button className="rounded-md bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-background">
                Filter
              </button>
            </form>
          </section>

          <section className="overflow-x-auto rounded-md border border-[var(--line)] bg-[var(--panel)]">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">QP Serial</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-[var(--muted)]">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b border-[var(--line)] last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 capitalize">{order.source}</td>
                      <td className="px-4 py-3">{order.customer.fullName}</td>
                      <td className="px-4 py-3 font-mono">{order.customer.phone}</td>
                      <td className="px-4 py-3">{order.customer.city}</td>
                      <td className="px-4 py-3 font-mono text-xs">{order.referenceID}</td>
                      <td className="px-4 py-3 font-mono">{order.qpSerial ?? "-"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge code={order.statusCode} label={order.statusLabel} />
                      </td>
                      <td className="px-4 py-3">
                        <Link className="font-semibold text-[var(--accent)]" href={`/orders/${order.id}`}>
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          {result && (
            <section className="flex flex-col gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-sm text-[var(--muted)] md:flex-row md:items-center md:justify-between">
              <p>
                Page {result.page} of {result.totalPages}. Total orders: {result.total}.
              </p>
              <nav className="flex flex-wrap items-center gap-2" aria-label="Orders pagination">
                {result.page > 1 ? (
                  <Link
                    href={pageHref(params, result.page - 1)}
                    className="rounded-md border border-[var(--line)] px-3 py-2 font-medium text-foreground transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    Previous
                  </Link>
                ) : (
                  <span
                    className="rounded-md border border-[var(--line)] px-3 py-2 text-[var(--muted)] opacity-50"
                    aria-disabled="true"
                  >
                    Previous
                  </span>
                )}

                {pageItems(result.page, result.totalPages).map((item, index) =>
                  item === "gap" ? (
                    <span key={`gap-${index}`} className="px-2 text-[var(--muted)]">
                      ...
                    </span>
                  ) : item === result.page ? (
                    <span
                      key={item}
                      className="rounded-md bg-[var(--accent)] px-3 py-2 font-semibold text-white"
                      aria-current="page"
                    >
                      {item}
                    </span>
                  ) : (
                    <Link
                      key={item}
                      href={pageHref(params, item)}
                      className="rounded-md border border-[var(--line)] px-3 py-2 font-medium text-foreground transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {item}
                    </Link>
                  ),
                )}

                {result.page < result.totalPages ? (
                  <Link
                    href={pageHref(params, result.page + 1)}
                    className="rounded-md border border-[var(--line)] px-3 py-2 font-medium text-foreground transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    Next
                  </Link>
                ) : (
                  <span
                    className="rounded-md border border-[var(--line)] px-3 py-2 text-[var(--muted)] opacity-50"
                    aria-disabled="true"
                  >
                    Next
                  </span>
                )}
              </nav>
            </section>
          )}
        </div>
      )}
    </AdminShell>
  );
}
