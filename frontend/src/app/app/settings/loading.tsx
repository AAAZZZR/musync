import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 max-w-lg" />
    </div>
  );
}
