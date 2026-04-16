"use client";

import { useEffect, useId, useRef } from "react";
import { toast } from "sonner";
import { googleAction } from "@/lib/server/actions/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleButton({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !window.google || !ref.current) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        const result = await googleAction(response.credential);
        if (!result.ok) toast.error(result.error);
      },
    });

    window.google.accounts.id.renderButton(ref.current, {
      type: "standard",
      theme: "outline",
      text: label.toLowerCase().includes("sign up") ? "signup_with" : "signin_with",
      size: "large",
      width: 360,
    });
  }, [clientId, label]);

  if (!clientId) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.
      </p>
    );
  }

  return <div id={`google-btn-${id}`} ref={ref} className="flex justify-center" />;
}
