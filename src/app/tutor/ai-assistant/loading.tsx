import { PageLoadingSkeleton } from "@/components/ui/PageSkeleton";
export default function Loading() {
  return <PageLoadingSkeleton showHeader={false} cards={1} rows={6} />;
}
