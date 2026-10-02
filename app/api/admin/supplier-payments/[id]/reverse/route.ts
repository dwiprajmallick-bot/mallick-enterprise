import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

import {
  makeSupplierPaymentNumber,
} from "@/lib/supplier-payment";

import {
  writeAuditLog,
  getRequestAuditMeta,
} from "@/lib/audit";

async function authorize() {

  const cookieStore =
    await cookies();

  return (
    cookieStore.get("officekart_admin")?.value ===
    "authenticated"
  );
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {

  try {

    if (!(await authorize())) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { id } =
      await context.params;

    const body =
      await request.json();

    const reason =
      String(
        body.reason || ""
      ).trim();

    if (!reason) {
      throw new Error(
        "Reversal reason is required."
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {

          const original =
            await tx.supplierPayment.findUnique({
              where: {
                id,
              },
              include: {
                supplierPaymentAllocations:
                  true,
              },
            });

          if (!original) {
            throw new Error(
              "Supplier payment not found."
            );
          }

          if (
            original.status !==
            "POSTED"
          ) {
            throw new Error(
              "Only POSTED supplier payments can be reversed."
            );
          }

          if (
            original.reversedAt
          ) {
            throw new Error(
              "Supplier payment is already reversed."
            );
          }

          const reversal =
            await tx.supplierPayment.create({
              data: {
                paymentNumber:
                  makeSupplierPaymentNumber(),

                supplierId:
                  original.supplierId,

                purchaseId:
                  original.purchaseId,

                amountPaise:
                  -Math.abs(
                    original.amountPaise
                  ),

                paymentMethod:
                  original.paymentMethod,

                transactionReference:
                  original.transactionReference,

                paymentDate:
                  new Date(),

                status:
                  "POSTED",

                postedAt:
                  new Date(),

                notes:
                  `REVERSAL of ${original.paymentNumber}: ${reason}`,

                reversalPaymentId:
                  original.id,
              },
            });

          for (
            const allocation of
              original.supplierPaymentAllocations
          ) {

            await tx.supplierPaymentAllocation.create({
              data: {
                supplierPaymentId:
                  reversal.id,

                purchaseId:
                  allocation.purchaseId,

                amountPaise:
                  -Math.abs(
                    allocation.amountPaise
                  ),
              },
            });
          }

          await tx.supplierPayment.update({
            where: {
              id:
                original.id,
            },
            data: {
              reversedAt:
                new Date(),

              reversalReason:
                reason,
            },
          });

          if (
            original.purchaseId
          ) {

            const purchase =
              await tx.purchase.findUnique({
                where: {
                  id:
                    original.purchaseId,
                },
              });

            if (purchase) {

              const allocations =
                await tx.supplierPaymentAllocation.findMany({
                  where: {
                    purchaseId:
                      purchase.id,
                  },
                  include: {
                    supplierPayment:
                      true,
                  },
                });

              const paidPaise =
                allocations
                  .filter(
                    (x) =>
                      x.supplierPayment.status ===
                      "POSTED"
                  )
                  .reduce(
                    (sum, x) =>
                      sum + x.amountPaise,
                    0
                  );

              let paymentStatus =
                "UNPAID";

              if (
                paidPaise >=
                purchase.totalPaise
              ) {
                paymentStatus =
                  "PAID";
              } else if (
                paidPaise > 0
              ) {
                paymentStatus =
                  "PARTIALLY_PAID";
              }

              await tx.purchase.update({
                where: {
                  id:
                    purchase.id,
                },
                data: {
                  paymentStatus,
                },
              });
            }
          }

          await writeAuditLog({
            db: tx,

            ...getRequestAuditMeta(request),

            action:
              "SUPPLIER_PAYMENT_REVERSE",

            entityType:
              "SupplierPayment",

            entityId:
              original.id,

            description:
              `Supplier payment ${original.paymentNumber} reversed.`,

            newValues: {
              reversalPaymentId:
                reversal.id,

              reason,

              amountPaise:
                original.amountPaise,
            },

            referenceType:
              "SupplierPayment",

            referenceId:
              original.id,
          });

          return {
            original,
            reversal,
          };
        }
      );

    return NextResponse.json({
      success: true,
      original:
        result.original,
      reversal:
        result.reversal,
    });

  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to reverse supplier payment.",
      },
      { status: 500 }
    );
  }
}