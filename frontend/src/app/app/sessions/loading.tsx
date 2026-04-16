import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-3">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}
