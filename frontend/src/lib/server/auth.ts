import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Profile } from "@prisma/client";

export async function getSupabaseUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireSupabaseUser() {
  const user = await getSupabaseUser();
  if (!user) redirect("/login");
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getSupabaseUser();
  if (!user) return null;
  return prisma.profile.findUnique({ where: { userId: user.id } });
}

export async function requireProfile(): Promise<Profile> {
  const user = await requireSupabaseUser();
  const fullName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User";
  return prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      email: user.email!,
      fullName,
    },
  });
}
