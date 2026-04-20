"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createBillingPortalAction,
  createCheckoutSessionAction,
} from "@/lib/server/actions/billing";

export function BillingPanel({
  plan,
  hasCustomer,
  periodEnd,
}: {
  plan: string;
  hasCustomer: boolean;
  periodEnd: string | null;
}) {
  const [pending, startTransition] = useTransition();

  function handleUpgrade() {
    startTransition(async () => {
      const r = await createCheckoutSessionAction();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      window.location.href = r.data.url;
    });
  }

  function handleManage() {
    startTransition(async () => {
      const r = await createBillingPortalAction();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      window.location.href = r.data.url;
    });
  }

  return (
    <Card className="grid gap-3 p-5">
      <div>
        <p className="font-medium">
          {plan === "pro" ? "Pro" : "Free"} plan
        </p>
        {plan === "pro" && periodEnd && (
          <p className="text-xs text-muted-foreground">
            Renews on {new Date(periodEnd).toLocaleDateString()}
          </p>
        )}
        {plan === "free" && (
          <p className="text-xs text-muted-foreground">
            Upgrade to Pro for unlimited track generation.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {plan === "free" ? (
          <Button onClick={handleUpgrade} disabled={pending}>
            {pending ? "Loading..." : "Upgrade to Pro"}
          </Button>
        ) : (
          <Button variant="outline" onClick={handleManage} disabled={pending}>
            {pending ? "Loading..." : "Manage subscription"}
          </Button>
        )}
        {hasCustomer && plan === "free" && (
          <Button variant="ghost" onClick={handleManage} disabled={pending}>
            Billing history
          </Button>
        )}
      </div>
    </Card>
  );
}
