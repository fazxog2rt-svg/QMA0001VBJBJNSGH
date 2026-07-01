import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-xl bg-gradient-to-br from-primary to-accent" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}
