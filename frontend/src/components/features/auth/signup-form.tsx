"use client";

import Link from "next/link";
import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "@/lib/server/actions/auth";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, null);

  if (state && !state.ok && !state.fieldErrors) {
    toast.error(state.error);
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Start your first focus session in under a minute.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="full_name">Name</Label>
        <Input id="full_name" name="full_name" type="text" autoComplete="name" required />
        {fieldErrors?.full_name ? (
          <p className="text-xs text-destructive">{fieldErrors.full_name[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {fieldErrors?.email ? (
          <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        {fieldErrors?.password ? (
          <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have one?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
