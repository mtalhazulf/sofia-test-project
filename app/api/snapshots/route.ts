import { NextRequest, NextResponse } from "next/server";
import { createSnapshotSchema } from "@/lib/validators";
import { createSnapshot } from "@/lib/services/snapshots";
import { jsonError, requireUser } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const body = await req.json();
  const parsed = createSnapshotSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid input: " + JSON.stringify(parsed.error.flatten()));
  }
  try {
    const snapshot = await createSnapshot(parsed.data, user.id);
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg.includes("Unique constraint")) {
      return jsonError(409, "A snapshot already exists for this quarter");
    }
    return jsonError(500, msg);
  }
}
