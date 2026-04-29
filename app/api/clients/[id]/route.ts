import { NextRequest, NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/services/clients";
import { updateClientSchema } from "@/lib/validators";
import { jsonError, requireUser } from "@/lib/auth-helpers";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  try {
    await requireUser();
  } catch (r) {
    return r as Response;
  }
  const client = await getClient(ctx.params.id);
  if (!client) return jsonError(404, "Client not found");
  return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const body = await req.json();
  const parsed = updateClientSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid input: " + JSON.stringify(parsed.error.flatten()));
  }
  try {
    await updateClient(ctx.params.id, parsed.data, user.id);
  } catch (e) {
    return jsonError(400, e instanceof Error ? e.message : "Update failed");
  }
  return NextResponse.json({ ok: true });
}
