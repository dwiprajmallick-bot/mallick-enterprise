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

  const supplierId =
    url.searchParams.get(
      "supplierId"
    ) || "";

  const purchases =
    await prisma.purchase.findMany({
      where: supplierId
        ? { supplierId }
        : undefined,
      orderBy: {
        purchasedAt:
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
      "Purchase",
    description:
      "Admin viewed purchase list.",
    newValues: {
      count:
        purchases.length,
      supplierId,
    },
  });

  return NextResponse.json({
    success: true,
    purchases,
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

    const supplierId =
      String(
        body.supplierId || ""
      ).trim();

    const items =
      Array.isArray(
        body.items
      )
        ? body.items
        : [];

    if (
      !supplierId ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "supplierId and at least one item are required.",
        },
        { status: 400 }
      );
    }

    const deliveryPaise =
      Number(
        body.deliveryPaise ||
          0
      );

    const paymentAmountPaise =
      Number(
        body.paymentAmountPaise ||
          0
      );

    if (
      !Number.isInteger(
        deliveryPaise
      ) ||
      deliveryPaise < 0 ||
      !Number.isInteger(
        paymentAmountPaise
      ) ||
      paymentAmountPaise < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Amounts must be non-negative integers.",
        },
        { status: 400 }
      );
    }

    const purchase =
      await prisma.$transaction(
        async (tx) => {

          const supplier =
            await tx.supplier.findUnique({
              where: {
                id: supplierId,
              },
            });

          if (!supplier) {
            throw new Error(
              "SUPPLIER_NOT_FOUND"
            );
          }

          let subtotalPaise =
            0;

          let gstPaise =
            0;

          const normalizedItems = [];

          for (
            const rawItem of items
          ) {

            const productId =
              String(
                rawItem.productId ||
                  ""
              ).trim();

            const quantity =
              Number(
                rawItem.quantity
              );

            const unitCostPaise =
              Number(
                rawItem.unitCostPaise
              );

            const gstRate =
              Number(
                rawItem.gstRate ||
                  0
              );

            if (
              !productId ||
              !Number.isInteger(
                quantity
              ) ||
              quantity <= 0 ||
              !Number.isInteger(
                unitCostPaise
              ) ||
              unitCostPaise < 0 ||
              !Number.isFinite(
                gstRate
              ) ||
              gstRate < 0
            ) {
              throw new Error(
                "INVALID_ITEM"
              );
            }

            const product =
              await tx.product.findUnique({
                where: {
                  id: productId,
                },
              });

            if (!product) {
              throw new Error(
                "PRODUCT_NOT_FOUND"
              );
            }

            const lineTotalPaise =
              quantity *
              unitCostPaise;

            const lineGstPaise =
              Math.round(
                lineTotalPaise *
                  (gstRate /
                    100)
              );

            subtotalPaise +=
              lineTotalPaise;

            gstPaise +=
              lineGstPaise;

            normalizedItems.push(
              {
                product,
                productId,
                quantity,
                unitCostPaise,
                gstRate,
                gstPaise:
                  lineGstPaise,
                lineTotalPaise,
              }
            );
          }

          const totalPaise =
            subtotalPaise +
            gstPaise +
            deliveryPaise;

          if (
            paymentAmountPaise >
            totalPaise
          ) {
            throw new Error(
              "PAYMENT_EXCEEDS_TOTAL"
            );
          }

          const paymentStatus =
            paymentAmountPaise ===
            0
              ? "UNPAID"
              : paymentAmountPaise ===
                  totalPaise
                ? "PAID"
                : "PARTIAL";

          const purchaseNumber =
            makeNumber("PUR");

          const created =
            await tx.purchase.create({
              data: {
                purchaseNumber,
                supplierId,
                status:
                  "RECEIVED",
                subtotalPaise,
                gstPaise,
                deliveryPaise,
                totalPaise,
                paymentStatus,
                notes:
                  body.notes
                    ? String(
                        body.notes
                      )
                    : null,
              },
            });

          for (
            const item of
              normalizedItems
          ) {

            await tx.purchaseItem.create({
              data: {
                purchaseId:
                  created.id,
                productId:
                  item.productId,
                description:
                  item.product.name,
                quantity:
                  item.quantity,
                unitCostPaise:
                  item.unitCostPaise,
                gstRate:
                  item.gstRate,
                gstPaise:
                  item.gstPaise,
                lineTotalPaise:
                  item.lineTotalPaise,
              },
            });

            const previousStock =
              item.product.stock;

            const newStock =
              previousStock +
              item.quantity;

            await tx.product.update({
              where: {
                id:
                  item.productId,
              },
              data: {
                stock:
                  newStock,
                purchasePrice:
                  item.unitCostPaise /
                  100,
              },
            });

            const movement =
              await tx.stockMovement.create({
                data: {
                  productId:
                    item.productId,
                  type:
                    "IN",
                  quantity:
                    item.quantity,
                  previousStock,
                  newStock,
                  note:
                    `Purchase ${created.purchaseNumber}`,
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
                AUDIT_ACTIONS.STOCK_IN,
              entityType:
                "Product",
              entityId:
                item.productId,
              description:
                "Stock received against purchase.",
              oldValues: {
                stock:
                  previousStock,
              },
              newValues: {
                stock:
                  newStock,
                quantity:
                  item.quantity,
                purchaseId:
                  created.id,
                movementId:
                  movement.id,
              },
              referenceType:
                "Purchase",
              referenceId:
                created.id,
            });
          }

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
              "Purchase",
            entityId:
              created.id,
            description:
              "Purchase created.",
            newValues:
              created,
            referenceType:
              "Supplier",
            referenceId:
              supplier.id,
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
              AUDIT_ACTIONS.PURCHASE,
            entityType:
              "Purchase",
            entityId:
              created.id,
            description:
              "Purchase completed and stock received.",
            newValues: {
              purchaseNumber:
                created.purchaseNumber,
              subtotalPaise,
              gstPaise,
              deliveryPaise,
              totalPaise,
              paymentStatus,
            },
            referenceType:
              "Supplier",
            referenceId:
              supplier.id,
          });

          if (
            gstPaise > 0
          ) {

            const gstRecord =
              await tx.gstRecord.create({
                data: {
                  gstNumber:
                    makeNumber(
                      "GSTIN"
                    ),
                  entryType:
                    "INPUT",
                  sourceType:
                    "Purchase",
                  sourceId:
                    created.id,
                  gstRate:
                    normalizedItems.length ===
                    1
                      ? normalizedItems[0]
                          .gstRate
                      : 0,
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
                "Input GST record created.",
              newValues:
                gstRecord,
              referenceType:
                "Purchase",
              referenceId:
                created.id,
            });
          }

          if (
            paymentAmountPaise >
            0
          ) {

            const payment =
              await tx.payment.create({
                data: {
                  paymentNumber:
                    makeNumber(
                      "PAY"
                    ),
                  type:
                    "PAY",
                  status:
                    "SUCCESS",
                  purchaseId:
                    created.id,
                  amountPaise:
                    paymentAmountPaise,
                  method:
                    String(
                      body.paymentMethod ||
                        "BANK_TRANSFER"
                    ),
                  reference:
                    body.paymentReference
                      ? String(
                          body.paymentReference
                        )
                      : null,
                  notes:
                    body.paymentNotes
                      ? String(
                          body.paymentNotes
                        )
                      : null,
                },
              });

            const ledger =
              await tx.ledgerEntry.create({
                data: {
                  ledgerNumber:
                    makeNumber(
                      "LED"
                    ),
                  entryType:
                    "DEBIT",
                  accountType:
                    "SUPPLIER",
                  accountId:
                    supplier.id,
                  purchaseId:
                    created.id,
                  paymentId:
                    payment.id,
                  amountPaise:
                    paymentAmountPaise,
                  description:
                    `Supplier payment for ${created.purchaseNumber}`,
                  referenceType:
                    "Payment",
                  referenceId:
                    payment.id,
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
                AUDIT_ACTIONS.PAYMENT_PAY,
              entityType:
                "Payment",
              entityId:
                payment.id,
              description:
                "Supplier payment recorded.",
              newValues:
                payment,
              referenceType:
                "Purchase",
              referenceId:
                created.id,
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
                AUDIT_ACTIONS.LEDGER_CREATE,
              entityType:
                "LedgerEntry",
              entityId:
                ledger.id,
              description:
                "Supplier payment ledger created.",
              newValues:
                ledger,
              referenceType:
                "Payment",
              referenceId:
                payment.id,
            });
          }

          return created;
        }
      );

    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error) {

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "SUPPLIER_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supplier not found.",
        },
        { status: 404 }
      );
    }

    if (
      message ===
      "PRODUCT_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product not found.",
        },
        { status: 404 }
      );
    }

    if (
      message ===
      "INVALID_ITEM"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid purchase item.",
        },
        { status: 400 }
      );
    }

    if (
      message ===
      "PAYMENT_EXCEEDS_TOTAL"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment cannot exceed purchase total.",
        },
        { status: 400 }
      );
    }

    console.error(
      "Purchase create error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Purchase creation failed.",
      },
      { status: 500 }
    );
  }
}