import { NextRequest, NextResponse } from "next/server";
import { updateSnapshotSchema } from "@/lib/validators";
import {
  SnapshotImmutableError,
  getSnapshot,
  updateSnapshot,
} from "@/lib/services/snapshots";
import { jsonError, requireUser } from "@/lib/auth-helpers";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  try {
    await requireUser();
  } catch (r) {
    return r as Response;
  }
  const snap = await getSnapshot(ctx.params.id);
  if (!snap) return jsonError(404, "Snapshot not found");
  return NextResponse.json({ snapshot: snap });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const body = await req.json();
  const parsed = updateSnapshotSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid input: " + JSON.stringify(parsed.error.flatten()));
  }
  try {
    await updateSnapshot(ctx.params.id, parsed.data, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SnapshotImmutableError) {
      return jsonError(409, e.message);
    }
    const msg = e instanceof Error ? e.message : "Server error";
    return jsonError(500, msg);
  }
}
