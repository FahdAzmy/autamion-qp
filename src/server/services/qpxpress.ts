import { getQpBaseUrl, optionalEnv, requireEnv } from "@/lib/env";
import { qpTokensCollection } from "@/server/db/collections";
import type { QpCreateOrderPayload } from "@/types/order";

type CachedToken = {
  token: string;
  companyName?: string;
  expiresAt?: Date;
};

let cachedToken: CachedToken | null = null;

function decodeJwtExpiry(token: string) {
  const [, payload] = token.split(".");

  if (!payload) return undefined;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
    };

    return decoded.exp ? new Date(decoded.exp * 1000) : undefined;
  } catch {
    return undefined;
  }
}

function tokenIsUsable(token?: CachedToken | null) {
  if (!token?.token) return false;
  if (!token.expiresAt) return true;
  return token.expiresAt.getTime() > Date.now() + 60_000;
}

async function requestNewToken(): Promise<CachedToken> {
  const response = await fetch(new URL("integration/token", getQpBaseUrl()), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: requireEnv("QP_USERNAME"),
      password: requireEnv("QP_PASSWORD"),
    }),
  });

  const body = (await response.json().catch(() => null)) as {
    token?: string;
    company_name?: string;
    detail?: string;
  } | null;

  if (!response.ok || !body?.token) {
    throw new Error(body?.detail ?? `QP auth failed with status ${response.status}`);
  }

  const token = {
    token: body.token,
    companyName: body.company_name,
    expiresAt: decodeJwtExpiry(body.token),
  };

  cachedToken = token;

  const collection = await qpTokensCollection();
  await collection.updateOne(
    { purpose: "qpxpress" },
    {
      $set: {
        purpose: "qpxpress",
        token: token.token,
        companyName: token.companyName,
        expiresAt: token.expiresAt,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  return token;
}

async function getStoredToken(): Promise<CachedToken | null> {
  if (tokenIsUsable(cachedToken)) return cachedToken;

  const stored = await (await qpTokensCollection()).findOne({ purpose: "qpxpress" });

  if (!stored?.token || typeof stored.token !== "string") return null;

  const token = {
    token: stored.token,
    companyName: typeof stored.companyName === "string" ? stored.companyName : undefined,
    expiresAt: stored.expiresAt instanceof Date ? stored.expiresAt : undefined,
  };

  cachedToken = token;
  return tokenIsUsable(token) ? token : null;
}

export async function getQpToken(forceRefresh = false) {
  if (!forceRefresh) {
    const stored = await getStoredToken();
    if (stored) return stored.token;
  }

  return (await requestNewToken()).token;
}

async function qpFetch(path: string, init: RequestInit = {}, refreshed = false): Promise<Response> {
  const token = await getQpToken(refreshed);
  const response = await fetch(new URL(path, getQpBaseUrl()), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (response.status === 401 && !refreshed) {
    return qpFetch(path, init, true);
  }

  return response;
}

async function readQpJson(response: Response) {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String(body.message)
        : `QP request failed with status ${response.status}`;
    throw Object.assign(new Error(message), { response: body, status: response.status });
  }

  return body;
}

export async function createQpOrder(payload: QpCreateOrderPayload) {
  const response = await qpFetch("integration/order", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return readQpJson(response);
}

export async function retrieveQpOrder(serial: string | number) {
  const response = await qpFetch(`integration/order/${serial}`, {
    method: "GET",
  });

  return readQpJson(response);
}

export async function qpConfigStatus() {
  return {
    baseUrl: getQpBaseUrl(),
    hasUsername: optionalEnv("QP_USERNAME") !== "",
    hasPassword: optionalEnv("QP_PASSWORD") !== "",
  };
}
