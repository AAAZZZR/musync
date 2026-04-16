import { Badge } from "@/components/ui/badge";
import type { FocusSessionStatus } from "@/types/api";

const variants: Record<FocusSessionStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  completed: "secondary",
  abandoned: "outline",
};

export function SessionStatusBadge({ status }: { status: FocusSessionStatus }) {
  return <Badge variant={variants[status] ?? "outline"}>{status}</Badge>;
}
