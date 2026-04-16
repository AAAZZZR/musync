"use client";

import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/server/actions/auth";
import type { User } from "@/types/api";

export function UserMenu({ user }: { user: User }) {
  const initial = user.email.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-md p-2 hover:bg-muted">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col items-start">
            <span className="text-sm font-medium leading-none">{user.email}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <form action={async () => { await logoutAction(); }}>
          <DropdownMenuItem asChild>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
