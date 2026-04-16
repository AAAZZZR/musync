import { Sidebar } from "./sidebar";
import type { User } from "@/types/api";

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-6 pb-28">{children}</main>
      </div>
    </div>
  );
}
