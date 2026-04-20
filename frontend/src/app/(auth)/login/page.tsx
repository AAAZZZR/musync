import { LoginForm } from "@/components/features/auth/login-form";
import { GoogleButton } from "@/components/features/auth/google-button";
import { Separator } from "@/components/ui/separator";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

export default function LoginPage() {
  return (
    <div className="grid gap-6">
      <GoogleButton
        href={`${API_BASE}/api/auth/oauth/google?next=/app/dashboard`}
        label="Continue with Google"
      />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>
      <LoginForm />
    </div>
  );
}
