import { NextRequest, NextResponse } from "next/server";
import { createClientSchema } from "@/lib/validators";
import { createClient, listClients } from "@/lib/services/clients";
import { jsonError, requireUser } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireUser();
  } catch (r) {
    return r as Response;
  }
  const clients = await listClients();
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (r) {
    return r as Response;
  }
  const body = await req.json();
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid input: " + JSON.stringify(parsed.error.flatten()));
  }
  const client = await createClient(parsed.data, user.id);
  return NextResponse.json({ client }, { status: 201 });
}
