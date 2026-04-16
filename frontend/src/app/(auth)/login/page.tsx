import { LoginForm } from "@/components/features/auth/login-form";
import { GoogleButton } from "@/components/features/auth/google-button";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <div className="grid gap-6">
      <GoogleButton label="Continue with Google" />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>
      <LoginForm />
    </div>
  );
}
