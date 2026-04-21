"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeEmailAction } from "@/lib/server/actions/auth";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(changeEmailAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(`Email updated to ${state.data.email}`);
      router.refresh();
    } else if (state && !state.ok && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="new_email">New email</Label>
        <Input
          id="new_email"
          name="new_email"
          type="email"
          placeholder={currentEmail}
          autoComplete="email"
          required
        />
        {fieldErrors?.new_email ? (
          <p className="text-xs text-destructive">{fieldErrors.new_email[0]}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Updating..." : "Change email"}
      </Button>
    </form>
  );
}
