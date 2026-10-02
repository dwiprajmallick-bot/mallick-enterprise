import { NextResponse } from "next/server";

import {
  requireCurrentAdminUser,
} from "@/lib/admin-auth";

import {
  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

import { prisma } from "@/lib/prisma";

function makeNumber(
  prefix: string
) {
  const stamp =
    new Date()
      .toISOString()
      .replace(/\D/g, "")
      .slice(0, 14);

  const random =
    Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase();

  return `${prefix}-${stamp}-${random}`;
}

export async function GET(
  request: Request
) {
  const user =
    await requireCurrentAdminUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  const url =
    new URL(request.url);

  const orderId =
    url.searchParams.get(
      "orderId"
    ) || "";

  const invoices =
    await prisma.invoice.findMany({
      where: orderId
        ? { orderId }
        : undefined,
      orderBy: {
        issuedAt:
          "desc",
      },
    });

  await writeAuditLog({
    actorUserId:
      user.id,
    actorRole:
      user.role,
    ...getRequestAuditMeta(
      request
    ),
    action:
      AUDIT_ACTIONS.VIEW,
    entityType:
      "Invoice",
    description:
      "Admin viewed invoices.",
    newValues: {
      count:
        invoices.length,
      orderId,
    },
  });

  return NextResponse.json({
    success: true,
    invoices,
  });
}

export async function POST(
  request: Request
) {
  const user =
    await requireCurrentAdminUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    const body =
      await request.json();

    const orderId =
      String(
        body.orderId || ""
      ).trim();

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "orderId is required.",
        },
        { status: 400 }
      );
    }

    const invoice =
      await prisma.$transaction(
        async (tx) => {

          const order =
            await tx.order.findUnique({
              where: {
                id: orderId,
              },
            });

          if (!order) {
            throw new Error(
              "ORDER_NOT_FOUND"
            );
          }

          const existing =
            await tx.invoice.findUnique({
              where: {
                orderId,
              },
            });

          if (existing) {
            throw new Error(
              "INVOICE_EXISTS"
            );
          }

          const subtotalPaise =
            Math.round(
              Number(
                order.subtotal ||
                  0
              ) * 100
            );

          const gstPaise =
            Math.round(
              Number(
                order.gstAmount ||
                  0
              ) * 100
            );

          const deliveryPaise =
            Math.round(
              Number(
                order.deliveryCharge ||
                  0
              ) * 100
            );

          const totalPaise =
            Math.round(
              Number(
                order.totalAmount ||
                  0
              ) * 100
            );

          const created =
            await tx.invoice.create({
              data: {
                invoiceNumber:
                  makeNumber(
                    "INV"
                  ),
                orderId,
                customerId:
                  order.customerId ||
                  null,
                status:
                  "ISSUED",
                paymentStatus:
                  order.paymentStatus ===
                  "PAID"
                    ? "PAID"
                    : "UNPAID",
                subtotalPaise,
                gstPaise,
                deliveryPaise,
                totalPaise,
                gstRate:
                  0,
                notes:
                  body.notes
                    ? String(
                        body.notes
                      )
                    : null,
              },
            });

          await writeAuditLog({
            db: tx,
            actorUserId:
              user.id,
            actorRole:
              user.role,
            ...getRequestAuditMeta(
              request
            ),
            action:
              AUDIT_ACTIONS.CREATE,
            entityType:
              "Invoice",
            entityId:
              created.id,
            description:
              "Invoice issued for order.",
            newValues:
              created,
            referenceType:
              "Order",
            referenceId:
              order.id,
          });

          if (
            gstPaise > 0
          ) {

            const gstRecord =
              await tx.gstRecord.create({
                data: {
                  gstNumber:
                    makeNumber(
                      "GSTOUT"
                    ),
                  entryType:
                    "OUTPUT",
                  sourceType:
                    "Invoice",
                  sourceId:
                    created.id,
                  gstRate:
                    0,
                  taxablePaise:
                    subtotalPaise,
                  gstPaise,
                  status:
                    "ACTIVE",
                },
              });

            await writeAuditLog({
              db: tx,
              actorUserId:
                user.id,
              actorRole:
                user.role,
              ...getRequestAuditMeta(
                request
              ),
              action:
                AUDIT_ACTIONS.GST_CREATE,
              entityType:
                "GstRecord",
              entityId:
                gstRecord.id,
              description:
                "Output GST record created.",
              newValues:
                gstRecord,
              referenceType:
                "Invoice",
              referenceId:
                created.id,
            });
          }

          return created;
        }
      );

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "ORDER_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Order not found.",
        },
        { status: 404 }
      );
    }

    if (
      message ===
      "INVOICE_EXISTS"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invoice already exists for this order.",
        },
        { status: 409 }
      );
    }

    console.error(
      "Invoice create error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Invoice creation failed.",
      },
      { status: 500 }
    );
  }
}