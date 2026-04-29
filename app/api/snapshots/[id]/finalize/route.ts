import { NextResponse } from "next/server";
import { finalizeSnapshot, SnapshotImmutableError } from "@/lib/services/snapshots";
import { generateReportsForSnapshot } from "@/lib/services/reports";
import { jsonError, requireUser } from "@/lib/auth-helpers";

export async function POST(_: Request, ctx: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }
  try {
    // Generate the reports first; if PDF generation fails we keep the snapshot
    // in DRAFT (SRS NFR-4: no orphans / silent finalize).
    const reports = await generateReportsForSnapshot(ctx.params.id, user.id);
    const snap = await finalizeSnapshot(ctx.params.id, user.id);
    return NextResponse.json({ snapshot: snap, reports });
  } catch (e) {
    if (e instanceof SnapshotImmutableError) {
      return jsonError(409, e.message);
    }
    const msg = e instanceof Error ? e.message : "Server error";
    return jsonError(400, msg);
  }
}
