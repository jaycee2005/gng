import type { Prisma } from "@prisma/client";
import { ConflictError } from "./actions";
import { canTransition, statusLabel, type Entity } from "./workflow";
import { ValidationError } from "./validation";

type Tx = Prisma.TransactionClient;

/**
 * Moves a record from `from` to `to` and writes the history row (FR-008).
 * The update only applies if the status is still `from`, so concurrent edits fail cleanly.
 */
export async function transition(
  tx: Tx,
  entity: Entity,
  id: string,
  from: string,
  to: string,
  changedById: string,
  reason?: string | null
) {
  if (!canTransition(entity, from, to))
    throw new ValidationError(`Cannot move from ${statusLabel(from)} to ${statusLabel(to)}.`);

  const where = { id, status: from };
  const data = { status: to };
  const result =
    entity === "Request"
      ? await tx.employerRequest.updateMany({ where, data })
      : entity === "Application"
        ? await tx.application.updateMany({ where, data })
        : await tx.assignment.updateMany({ where, data });

  if (result.count === 0) throw new ConflictError();

  return tx.statusChange.create({
    data: {
      entityType: entity,
      entityId: id,
      fromStatus: from,
      toStatus: to,
      changedById,
      reason: reason || null,
      requestId: entity === "Request" ? id : null,
      applicationId: entity === "Application" ? id : null,
      assignmentId: entity === "Assignment" ? id : null,
    },
  });
}

