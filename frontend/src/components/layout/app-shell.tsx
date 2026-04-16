import { Sidebar } from "./sidebar";
import type { Profile } from "@prisma/client";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-6 pb-28">{children}</main>
      </div>
    </div>
  );
}
