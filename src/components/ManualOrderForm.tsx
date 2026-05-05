"use client";

import { FormEvent, useState } from "react";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function fieldValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

export function ManualOrderForm() {
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "submitting" });

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fieldValue(formData, "fullName"),
        phone: fieldValue(formData, "phone"),
        altPhone: fieldValue(formData, "altPhone"),
        city: fieldValue(formData, "city"),
        qpCityId: fieldValue(formData, "qpCityId"),
        address: fieldValue(formData, "address"),
        shipmentContents: fieldValue(formData, "shipmentContents"),
        totalAmount: fieldValue(formData, "totalAmount"),
        weight: fieldValue(formData, "weight"),
        notes: fieldValue(formData, "notes"),
        orderDate: fieldValue(formData, "orderDate"),
        paymentMethod: fieldValue(formData, "paymentMethod"),
        referenceID: fieldValue(formData, "referenceID"),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setState({
        status: "error",
        message: result.errors?.join(" ") ?? result.error?.message ?? result.error ?? "Order failed.",
      });
      return;
    }

    const serial = result.order?.qpSerial ? ` QP serial: ${result.order.qpSerial}.` : "";
    const error = result.order?.lastError ? " QP send failed; retry is available from details." : "";
    setState({ status: "success", message: `Order saved.${serial}${error}` });
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Full name
          <input name="fullName" required className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Phone
          <input name="phone" required className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Alt phone
          <input name="altPhone" className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          City
          <input name="city" required className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          QP city ID
          <input name="qpCityId" className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Address
        <textarea name="address" required rows={3} className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Shipment contents
        <textarea
          name="shipmentContents"
          required
          rows={4}
          className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Total amount
          <input name="totalAmount" required className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Weight
          <input name="weight" placeholder="0.00" className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Payment method
          <input name="paymentMethod" placeholder="cod" className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Order date
          <input
            name="orderDate"
            type="datetime-local"
            className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Reference ID
          <input name="referenceID" className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Notes
        <textarea name="notes" rows={3} className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={state.status === "submitting"}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          {state.status === "submitting" ? "Creating..." : "Create and send to QP"}
        </button>
        {state.status === "success" && <p className="text-sm font-medium text-[var(--accent)]">{state.message}</p>}
        {state.status === "error" && <p className="text-sm font-medium text-[var(--danger)]">{state.message}</p>}
      </div>
    </form>
  );
}
