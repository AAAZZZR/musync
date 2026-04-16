import { ProfileForm } from "@/components/features/settings/profile-form";
import { requireProfile } from "@/lib/server/auth";
import { MOODS } from "@/lib/constants/moods";

export default async function SettingsPage() {
  const profile = await requireProfile();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Update your profile and focus preferences.</p>
      </div>
      <ProfileForm
        profile={{
          user_id: profile.userId,
          full_name: profile.fullName,
          onboarding_complete: profile.onboardingComplete,
          preferred_mood: profile.preferredMood,
          daily_focus_minutes: profile.dailyFocusMinutes,
          background_volume: profile.backgroundVolume,
        }}
        moods={MOODS}
      />
    </div>
  );
}
