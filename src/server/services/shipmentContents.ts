import type { OrderItem } from "@/types/order";

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function numberValue(text: string | undefined) {
  const normalized = String(text ?? "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  const match = normalized.match(/\d+(?:\.\d+)?/);

  return match ? Number(match[0]) : 1;
}

function shortenProductName(name: string) {
  const words = normalizeText(name).split(" ").filter(Boolean);
  return words.slice(0, 2).join(" ") || "منتج";
}

function formatQuantity(quantity: number) {
  return String(quantity);
}

function formatSize(size: string) {
  const normalized = normalizeText(size);
  const key = normalized.toLowerCase();

  if (key === "m" || key === "medium") return "ميديام";
  if (key === "l" || key === "large") return "لارج";

  return normalized;
}

function formatRange(range: string) {
  return normalizeText(range).replace(/\s+الى\s+/g, " إلى ");
}

function describeVariantPart(variant: string | undefined) {
  const normalized = normalizeText(variant ?? "");
  const colorMatch = normalized.match(/لون:\s*(.*?)(?=\s+مقاس:|$)/);
  const sizeMatch = normalized.match(/مقاس:\s*(.*)$/);
  const sizeWithRange = normalizeText(sizeMatch?.[1] ?? "");
  const sizeRangeMatch = sizeWithRange.match(/^(\S+)\s+(من\s+.+)$/);

  return {
    color: normalizeText(colorMatch?.[1] ?? ""),
    size: formatSize(sizeRangeMatch?.[1] ?? sizeWithRange),
    range: formatRange(sizeRangeMatch?.[2] ?? ""),
    fallback: normalized,
  };
}

function formatVariantLine(part: { color: string; fallback: string; quantity: number; range: string; size: string }) {
  if (!part.color && !part.size && !part.range) {
    return [`العدد ${formatQuantity(part.quantity)}`, part.fallback]
      .filter(Boolean)
      .join("، ");
  }

  return [
    `العدد ${formatQuantity(part.quantity)}`,
    part.color ? `اللون ${part.color}` : undefined,
    part.size ? `المقاس ${part.size}` : undefined,
    part.range ? `الوزن ${part.range}` : undefined,
  ]
    .filter(Boolean)
    .join("، ");
}

function formatShipmentItemGroup(name: string, items: OrderItem[]) {
  const totalQuantity = items.reduce((sum, item) => sum + numberValue(item.quantity), 0);
  const variantParts = items.map((item) => ({
    ...describeVariantPart(item.variant),
    quantity: numberValue(item.quantity),
  }));
  const variants = new Map<
    string,
    { color: string; fallback: string; quantity: number; range: string; size: string }
  >();

  for (const part of variantParts) {
    const key = `${part.color}\0${part.size}\0${part.range}\0${part.fallback}`;
    const current = variants.get(key);

    if (current) {
      current.quantity += part.quantity;
      continue;
    }

    variants.set(key, part);
  }

  const details = [...variants.values()].map(formatVariantLine).filter(Boolean);

  return [`${shortenProductName(name)}، العدد ${formatQuantity(totalQuantity)}`, ...details]
    .filter(Boolean)
    .join("\n");
}

export function buildShipmentContents(items: OrderItem[]) {
  const groups = new Map<string, OrderItem[]>();

  for (const item of items) {
    const key = normalizeText(item.name);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.values()]
    .map((group) => formatShipmentItemGroup(group[0].name, group))
    .join("\n\n");
}
