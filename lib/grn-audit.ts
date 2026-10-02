import { prisma } from "@/lib/prisma";

type GRNAuditInput = {
  action:
    | "CREATE"
    | "UPDATE"
    | "POST"
    | "CANCEL"
    | "VIEW"
    | "CONVERT_TO_PURCHASE";
  grnId: string;
  grnNumber?: string | null;
  userId?: string | null;
  userName?: string | null;
  details?: Record<string, unknown>;
};

export async function createGRNAuditLog(
  input: GRNAuditInput
) {
  try {
    const payload = {
      entity: "GRN",
      entityId: input.grnId,
      action: input.action,
      referenceNumber:
        input.grnNumber ?? null,
      userId:
        input.userId ?? null,
      userName:
        input.userName ?? null,
      details:
        input.details ?? {},
    };

    const auditModel =
      prisma.auditLog as any;

    if (
      typeof auditModel?.create !==
      "function"
    ) {
      console.warn(
        "AuditLog model is not available."
      );

      return null;
    }

    return await auditModel.create({
      data: payload,
    });
  } catch (error) {
    console.error(
      "GRN audit log error:",
      error
    );

    return null;
  }
}
