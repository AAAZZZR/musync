import { Button } from "@/components/ui/button";

export function GoogleButton({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="outline" type="button" className="w-full">
      <a href={href}>{label}</a>
    </Button>
  );
}
