import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-32" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64" />
    </div>
  );
}
