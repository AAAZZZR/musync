import { Sidebar } from "./sidebar";

export function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar email={email} />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-6 pb-28">{children}</main>
      </div>
    </div>
  );
}
