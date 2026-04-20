"use server";

import { asActionResult, serverFetch } from "@/lib/server/api";
import type { ActionResult, BillingUrl } from "@/types/api";

export async function createCheckoutSessionAction(): Promise<ActionResult<{ url: string }>> {
  return asActionResult(() =>
    serverFetch<BillingUrl>("/api/billing/checkout", { method: "POST" }),
  );
}

export async function createBillingPortalAction(): Promise<ActionResult<{ url: string }>> {
  return asActionResult(() =>
    serverFetch<BillingUrl>("/api/billing/portal", { method: "POST" }),
  );
}
