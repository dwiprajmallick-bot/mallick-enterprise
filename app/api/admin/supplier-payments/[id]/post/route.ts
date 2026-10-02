import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

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

    const result =
      await prisma.$transaction(
        async (tx) => {

          const payment =
            await tx.supplierPayment.findUnique({
              where: {
                id,
              },
              include: {
                supplierPaymentAllocations: true,
              },
            });

          if (!payment) {
            throw new Error(
              "Supplier payment not found."
            );
          }

          if (
            payment.status !==
            "DRAFT"
          ) {
            throw new Error(
              "Only DRAFT supplier payments can be posted."
            );
          }

          const supplier =
            await tx.supplier.findUnique({
              where: {
                id: payment.supplierId,
              },
            });

          if (!supplier) {
            throw new Error(
              "Supplier not found."
            );
          }

          if (
            payment.purchaseId
          ) {

            const purchase =
              await tx.purchase.findUnique({
                where: {
                  id:
                    payment.purchaseId,
                },
              });

            if (!purchase) {
              throw new Error(
                "Linked purchase not found."
              );
            }

            if (
              purchase.supplierId !==
              payment.supplierId
            ) {
              throw new Error(
                "Supplier mismatch."
              );
            }

            const allocations =
              await tx.supplierPaymentAllocation.findMany({
                where: {
                  purchaseId:
                    purchase.id,
                },
                include: {
                  supplierPayment: true,
                },
              });

            const paidBefore =
              allocations
                .filter(
                  (x) =>
                    x.supplierPayment.status ===
                      "POSTED" &&
                    x.supplierPayment.id !==
                      payment.id
                )
                .reduce(
                  (sum, x) =>
                    sum + x.amountPaise,
                  0
                );

            if (
              paidBefore +
                payment.amountPaise >
              purchase.totalPaise
            ) {
              throw new Error(
                "Posting this payment would overpay the purchase."
              );
            }

            const nextStatus =
              paidBefore +
                payment.amountPaise ===
              purchase.totalPaise
                ? "PAID"
                : "PARTIALLY_PAID";

            await tx.purchase.update({
              where: {
                id: purchase.id,
              },
              data: {
                paymentStatus:
                  nextStatus,
              },
            });
          }

          const posted =
            await tx.supplierPayment.update({
              where: {
                id,
              },
              data: {
                status:
                  "POSTED",

                postedAt:
                  new Date(),

                approvedAt:
                  new Date(),
              },
            });

          await writeAuditLog({
            db: tx,

            ...getRequestAuditMeta(request),

            action:
              "SUPPLIER_PAYMENT_POST",

            entityType:
              "SupplierPayment",

            entityId:
              payment.id,

            description:
              `Supplier payment ${payment.paymentNumber} posted.`,

            newValues: {
              status: "POSTED",
              amountPaise:
                payment.amountPaise,
              purchaseId:
                payment.purchaseId,
            },

            referenceType:
              "SupplierPayment",

            referenceId:
              payment.id,
          });

          return posted;
        }
      );

    return NextResponse.json({
      success: true,
      payment: result,
    });

  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to post supplier payment.",
      },
      { status: 500 }
    );
  }
}