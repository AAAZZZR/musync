"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/lib/server/actions/auth";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, null);

  useEffect(() => {
    if (state?.ok) toast.success("Password updated");
    else if (state && !state.ok && !state.fieldErrors) toast.error(state.error);
  }, [state]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="current_password">Current password</Label>
        <Input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
        />
        {fieldErrors?.current_password ? (
          <p className="text-xs text-destructive">{fieldErrors.current_password[0]}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new_password">New password</Label>
        <Input
          id="new_password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        {fieldErrors?.new_password ? (
          <p className="text-xs text-destructive">{fieldErrors.new_password[0]}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm_new_password">Confirm new password</Label>
        <Input
          id="confirm_new_password"
          name="confirm_new_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        {fieldErrors?.confirm_new_password ? (
          <p className="text-xs text-destructive">{fieldErrors.confirm_new_password[0]}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
