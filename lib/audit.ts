import { prisma } from "@/lib/prisma";

export type AuditEvent = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  payload?: unknown;
};

export async function writeAudit(event: AuditEvent) {
  await prisma.auditLog.create({
    data: {
      actorId: event.actorId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      payload: event.payload ? JSON.stringify(event.payload) : null,
    },
  });
}
