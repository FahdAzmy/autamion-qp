export function SetupNotice({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <p className="font-semibold">Configuration needed</p>
      <p className="mt-1">{message}</p>
      <p className="mt-2">
        Fill `.env` with MongoDB, QP Express, and EasyOrders webhook values before using live
        actions.
      </p>
    </div>
  );
}
