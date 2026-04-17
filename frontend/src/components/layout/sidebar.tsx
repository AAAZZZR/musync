"use client";

import Link from "next/link";
import { Home, LayoutDashboard, Settings } from "lucide-react";
import { SidebarNavItem } from "./sidebar-nav-item";
import { UserMenu } from "./user-menu";

export function Sidebar({ email }: { email: string }) {
  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-card/40">
      <div className="px-4 py-5">
        <Link href="/" className="font-serif text-xl font-semibold">
          MuSync
        </Link>
      </div>
      <nav className="grid gap-1 px-2">
        <SidebarNavItem href="/" icon={Home} label="Player" />
        <SidebarNavItem href="/app/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <SidebarNavItem href="/app/settings" icon={Settings} label="Settings" />
      </nav>
      <div className="mt-auto border-t p-2">
        <UserMenu email={email} />
      </div>
    </aside>
  );
}
