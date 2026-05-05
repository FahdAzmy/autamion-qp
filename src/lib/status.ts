export type LocalStatusCode = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const STATUS_LABELS: Record<LocalStatusCode, string> = {
  0: "QP Failed",
  1: "Pending",
  2: "Out For Delivery",
  3: "Delivered",
  4: "Hold",
  5: "Undelivered",
  6: "Rejected",
};

export function statusFromQp(qpStatus?: string | null): LocalStatusCode {
  const normalized = (qpStatus ?? "").trim().toLowerCase().replace(/\s+/g, "");

  if (normalized === "pending") return 1;
  if (normalized === "outfordeliver" || normalized === "outfordelivery") return 2;
  if (normalized === "delivered") return 3;
  if (normalized === "hold") return 4;
  if (normalized === "undelivered") return 5;
  if (normalized === "rejected") return 6;

  return 0;
}

export function statusLabel(code: LocalStatusCode) {
  return STATUS_LABELS[code] ?? STATUS_LABELS[0];
}
