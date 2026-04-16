import { ProfileForm } from "@/components/features/settings/profile-form";
import { serverFetch } from "@/lib/server/api";
import type { Mood, Profile } from "@/types/api";

export default async function SettingsPage() {
  const [profile, moods] = await Promise.all([
    serverFetch<Profile>("/api/profile"),
    serverFetch<Mood[]>("/api/catalog/moods"),
  ]);
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Update your profile and focus preferences.</p>
      </div>
      <ProfileForm profile={profile} moods={moods} />
    </div>
  );
}
