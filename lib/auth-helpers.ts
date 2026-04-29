import { auth } from "@/auth";
import { NextResponse } from "next/server";

export type SessionUser = { id: string; email: string };

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user as { id?: string; email?: string } | undefined;
  if (!u?.id || !u.email) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return { id: u.id, email: u.email };
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}
