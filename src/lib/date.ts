export function toQpDateTime(value?: string | Date | null) {
  if (!value) return new Date().toISOString();

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
  }

  const trimmed = value.trim();
  if (!trimmed) return new Date().toISOString();

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return trimmed;
}
