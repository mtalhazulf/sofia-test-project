import { NextResponse } from "next/server";
import { getClient } from "@/lib/services/clients";
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
