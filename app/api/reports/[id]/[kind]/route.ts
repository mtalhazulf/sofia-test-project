import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { jsonError, requireUser } from "@/lib/auth-helpers";
import { Readable } from "node:stream";

const KINDS = new Set(["sacs", "tcc"]);

export async function GET(
  _: Request,
  ctx: { params: { id: string; kind: string } },
) {
  try {
    await requireUser();
  } catch (r) {
    return r as Response;
  }
  const kind = ctx.params.kind.toLowerCase();
  if (!KINDS.has(kind)) return jsonError(400, "Unknown report kind");

  const report = await prisma.report.findUnique({
    where: { snapshotId_kind: { snapshotId: ctx.params.id, kind: kind.toUpperCase() } },
    include: { snapshot: { include: { client: true } } },
  });
  if (!report) return jsonError(404, "Report not found");
  if (!(await storage.exists(report.storagePath))) {
    return jsonError(404, "Report file missing on disk");
  }

  const filename = `${report.snapshot.client.householdName.replace(/[^a-z0-9]+/gi, "_")}_${kind.toUpperCase()}_Q${report.snapshot.fiscalQuarter}_${report.snapshot.fiscalYear}.pdf`;

  const node = storage.readStream(report.storagePath);
  // Convert Node stream to a Web ReadableStream that NextResponse accepts.
  const web = Readable.toWeb(node as Readable) as unknown as ReadableStream<Uint8Array>;

  return new NextResponse(web, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
