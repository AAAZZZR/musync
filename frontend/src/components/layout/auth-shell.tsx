import Link from "next/link";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-8 block text-center text-lg font-semibold">
          MuSync
        </Link>
        <div className="rounded-lg border bg-card p-8 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
