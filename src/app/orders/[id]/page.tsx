import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { OrderActions } from "@/components/OrderActions";
import { SetupNotice } from "@/components/SetupNotice";
import { StatusBadge } from "@/components/StatusBadge";
import { getOrderById, getOrderLogs, normalizeError, serializeLog, serializeOrder } from "@/server/services/orders";

export const dynamic = "force-dynamic";

type OrderDetailsPageProps = {
  params: Promise<{ id: string }>;
};

function JsonBlock({ value }: { value: unknown }) {
  if (!value) return <p className="text-sm text-[var(--muted)]">None.</p>;

  return (
    <pre className="max-h-96 overflow-auto rounded-md border border-[var(--line)] bg-background p-3 text-xs leading-5">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { id } = await params;
  let setupMessage = "";
  let orderDocument: Awaited<ReturnType<typeof getOrderById>> = null;
  let logs: ReturnType<typeof serializeLog>[] = [];

  try {
    orderDocument = await getOrderById(id);
    logs = (await getOrderLogs(id)).map(serializeLog);
  } catch (error) {
    setupMessage = normalizeError(error).message;
  }

  if (setupMessage) {
    return (
      <AdminShell>
        <SetupNotice message={setupMessage} />
      </AdminShell>
    );
  }

  if (!orderDocument) {
    notFound();
  }

  const order = serializeOrder(orderDocument);

  return (
    <AdminShell>
      <div className="mb-6">
        <Link href="/orders" className="text-sm font-semibold text-[var(--accent)]">
          Back to orders
        </Link>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">{order.customer.fullName}</h2>
            <p className="mt-2 font-mono text-sm text-[var(--muted)]">{order.referenceID}</p>
          </div>
          <StatusBadge code={order.statusCode} label={order.statusLabel} />
        </div>
      </div>

      <div className="grid gap-5">
        <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
          <h3 className="text-lg font-semibold">Actions</h3>
          <div className="mt-4">
            <OrderActions orderId={order.id} canRetry={!order.qpSerial && order.statusCode === 0} />
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
            <h3 className="text-lg font-semibold">Customer</h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Phone</dt>
                <dd className="font-mono">{order.customer.phone}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Alt phone</dt>
                <dd className="font-mono">{order.customer.altPhone || "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">City</dt>
                <dd>{order.customer.city}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Address</dt>
                <dd>{order.customer.address}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
            <h3 className="text-lg font-semibold">QP Express</h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-[var(--muted)]">QP serial</dt>
                <dd className="font-mono">{order.qpSerial ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">QP status</dt>
                <dd>{order.qpStatus ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Source</dt>
                <dd className="capitalize">{order.source}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
          <h3 className="text-lg font-semibold">Shipment</h3>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-[var(--muted)]">Order date</dt>
              <dd className="font-mono">{order.shipment.orderDate}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Total amount</dt>
              <dd className="font-mono">{order.shipment.totalAmount}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Weight</dt>
              <dd className="font-mono">{order.shipment.weight}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Notes</dt>
              <dd className="whitespace-pre-wrap">{order.shipment.notes || "-"}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <dt className="text-sm text-[var(--muted)]">Contents</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm">{order.shipment.shipmentContents}</dd>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
            <h3 className="text-lg font-semibold">Last error</h3>
            <div className="mt-4">
              <JsonBlock value={order.lastError} />
            </div>
          </div>
          <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
            <h3 className="text-lg font-semibold">Source payload</h3>
            <div className="mt-4">
              <JsonBlock value={order.rawSourcePayload} />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
          <h3 className="text-lg font-semibold">Logs</h3>
          <div className="mt-4 grid gap-3">
            {logs.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No logs yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border-b border-[var(--line)] pb-3 last:border-0">
                  <p className="text-sm font-semibold">{log.message}</p>
                  <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                    {new Date(log.createdAt).toLocaleString()} · {log.type}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
