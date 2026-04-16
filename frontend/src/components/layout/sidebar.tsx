import Link from "next/link";
import { LayoutDashboard, Music, Library, Timer, Settings } from "lucide-react";
import { SidebarNavItem } from "./sidebar-nav-item";
import { UserMenu } from "./user-menu";
import type { User } from "@/types/api";

export function Sidebar({ user }: { user: User }) {
  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-card/40">
      <div className="px-4 py-5">
        <Link href="/app/dashboard" className="text-lg font-semibold">MuSync</Link>
      </div>
      <nav className="grid gap-1 px-2">
        <SidebarNavItem href="/app/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <SidebarNavItem href="/app/play" icon={Music} label="Play" />
        <SidebarNavItem href="/app/library" icon={Library} label="Library" />
        <SidebarNavItem href="/app/sessions" icon={Timer} label="Sessions" />
        <SidebarNavItem href="/app/settings" icon={Settings} label="Settings" />
      </nav>
      <div className="mt-auto border-t p-2">
        <UserMenu user={user} />
      </div>
    </aside>
  );
}
