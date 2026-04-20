import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/features/onboarding/onboarding-form";
import { MOODS } from "@/lib/constants/moods";
import { requireProfile } from "@/lib/server/auth";

export default async function OnboardingPage() {
  const profile = await requireProfile();
  if (profile.onboarding_complete) redirect("/app/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-semibold">Welcome to MuSync, {profile.full_name}</h1>
          <p className="mt-2 text-muted-foreground">A couple of quick preferences to personalize your focus sessions.</p>
        </div>
        <OnboardingForm
          moods={MOODS}
          defaults={{
            preferred_mood: profile.preferred_mood,
            daily_focus_minutes: profile.daily_focus_minutes,
          }}
        />
      </div>
    </div>
  );
}
