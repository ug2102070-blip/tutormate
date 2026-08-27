export const dynamic = "force-dynamic";

import { verifyUserAuth } from "@/lib/authHelpers";
import { getTutorMaterials } from "@/actions/materialActions";
import { getTutorBatches } from "@/actions/batchActions";
import MaterialsClient from "@/components/tutor/materials/MaterialsClient";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

/**
 * Materials Page (Server Component)
 * Optimized for professional SaaS performance:
 * - Zero loading flicker (Server-side data fetching)
 * - Zero-latency auth (JWT Claims)
 * - Optimistic UI for deletions & updates
 */
export default async function MaterialsPage() {
  const authState = await verifyUserAuth();

  // Parallel fetching of critical data
  const [materials, batches] = await Promise.all([
    getTutorMaterials(),
    getTutorBatches(),
  ]);

  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
        <p className="text-sm font-medium">Loading materials...</p>
      </div>
    }>
      <MaterialsClient
        initialMaterials={materials}
        initialBatches={batches}
        userId={authState.uid}
        tutorId={authState.tutorId || authState.uid}
      />
    </Suspense>
  );
}
