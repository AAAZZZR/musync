import { prisma } from "@/lib/prisma";

export async function canGenerateTrack(profileId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { trackLimit: true },
  });

  if (!profile) return { allowed: false, current: 0, limit: 0 };

  const current = await prisma.track.count({
    where: { profileId },
  });

  return {
    allowed: current < profile.trackLimit,
    current,
    limit: profile.trackLimit,
  };
}
