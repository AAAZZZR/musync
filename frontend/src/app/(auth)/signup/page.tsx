import { SignupForm } from "@/components/features/auth/signup-form";
import { GoogleButton } from "@/components/features/auth/google-button";
import { Separator } from "@/components/ui/separator";

export default function SignupPage() {
  return (
    <div className="grid gap-6">
      <GoogleButton label="Sign up with Google" />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>
      <SignupForm />
    </div>
  );
}
