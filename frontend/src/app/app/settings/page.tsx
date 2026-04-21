import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProfileForm } from "@/components/features/settings/profile-form";
import { BillingPanel } from "@/components/features/settings/billing-panel";
import { ChangePasswordForm } from "@/components/features/settings/change-password-form";
import { ChangeEmailForm } from "@/components/features/settings/change-email-form";
import { DeleteAccountPanel } from "@/components/features/settings/delete-account-panel";
import { MOODS } from "@/lib/constants/moods";
import { requireProfile } from "@/lib/server/auth";
import { serverFetch } from "@/lib/server/api";
import type { Track } from "@/types/api";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const tracks = await serverFetch<Track[]>("/api/tracks");

  return (
    <div className="grid max-w-2xl gap-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Account & focus preferences.</p>
      </div>

      <section className="grid gap-3">
        <h2 className="font-serif text-lg font-semibold">Account</h2>
        <Card className="grid gap-2 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{profile.email}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan</span>
            <Badge variant={profile.plan === "free" ? "outline" : "default"}>{profile.plan}</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tracks</span>
            <span className="text-sm tabular-nums">
              {tracks.length} / {profile.track_limit}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Member since</span>
            <span className="text-sm">{new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
        </Card>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-lg font-semibold">Billing</h2>
        <BillingPanel
          plan={profile.plan}
          hasCustomer={!!profile.stripe_customer_id}
          periodEnd={profile.stripe_current_period_end}
        />
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-lg font-semibold">Profile</h2>
        <Card className="p-6">
          <ProfileForm profile={profile} moods={MOODS} />
        </Card>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-lg font-semibold">Security</h2>
        <Card className="grid gap-6 p-6">
          <div className="grid gap-3">
            <div>
              <h3 className="font-medium">Change password</h3>
              <p className="text-xs text-muted-foreground">
                You&apos;ll be signed out of other devices after this takes effect.
              </p>
            </div>
            <ChangePasswordForm />
          </div>
          <Separator />
          <div className="grid gap-3">
            <div>
              <h3 className="font-medium">Change email</h3>
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-mono">{profile.email}</span>
              </p>
            </div>
            <ChangeEmailForm currentEmail={profile.email} />
          </div>
        </Card>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-lg font-semibold text-destructive">Danger zone</h2>
        <Card className="grid gap-3 border-destructive/40 p-6">
          <div>
            <h3 className="font-medium">Delete account</h3>
            <p className="text-xs text-muted-foreground">
              Remove your profile and all associated tracks, sessions, and data permanently.
            </p>
          </div>
          <div>
            <DeleteAccountPanel email={profile.email} />
          </div>
        </Card>
      </section>
    </div>
  );
}
