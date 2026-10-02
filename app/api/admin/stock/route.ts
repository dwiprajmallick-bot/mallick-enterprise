import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
  requireCurrentAdminUser,
} from "@/lib/admin-auth";

import {
  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

const MOVEMENT_TYPES = [
  "IN",
  "OUT",
  "ADJUSTMENT",
];

export async function GET(request: Request) {
  const user =
    await requireCurrentAdminUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const { searchParams } =
      new URL(request.url);

    const productId =
      searchParams.get(
        "productId"
      );

    const movements =
      await prisma.stockMovement.findMany({
        where: productId
          ? {
              productId,
            }
          : undefined,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              unit: true,
              stock: true,
            },
          },
        },
      });

    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(
        request
      ),
      action: AUDIT_ACTIONS.VIEW,
      entityType: "StockMovement",
      description:
        "Admin viewed stock movement history.",
      newValues: {
        productId:
          productId || null,
        count:
          movements.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: movements,
    });
  } catch (error) {
    console.error(
      "Get stock movements error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load stock history",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  const user =
    await requireCurrentAdminUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const body =
      await request.json();

    const productId =
      String(
        body.productId ?? ""
      ).trim();

    const type =
      String(
        body.type ?? ""
      )
        .trim()
        .toUpperCase();

    const note =
      String(
        body.note ?? ""
      ).trim();

    const quantity =
      Number(body.quantity);

    if (!productId) {
      return NextResponse.json(
        {
          error:
            "Product is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !MOVEMENT_TYPES.includes(
        type
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid movement type. Allowed: IN, OUT, ADJUSTMENT",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        quantity
      ) ||
      quantity <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Quantity must be a positive integer",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
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

          const previousStock =
            product.stock;

          let newStock =
            previousStock;

          if (type === "IN") {
            newStock =
              previousStock +
              quantity;
          }

          if (type === "OUT") {
            if (
              quantity >
              previousStock
            ) {
              throw new Error(
                "INSUFFICIENT_STOCK"
              );
            }

            newStock =
              previousStock -
              quantity;
          }

          if (
            type ===
            "ADJUSTMENT"
          ) {
            newStock =
              quantity;
          }

          const updatedProduct =
            await tx.product.update({
              where: {
                id: productId,
              },
              data: {
                stock: newStock,
              },
            });

          const movement =
            await tx.stockMovement.create({
              data: {
                productId,
                type,
                quantity,
                previousStock,
                newStock,
                note:
                  note || null,
              },
            });

          const auditAction =
            type === "IN"
              ? AUDIT_ACTIONS.STOCK_IN
              : type === "OUT"
                ? AUDIT_ACTIONS.STOCK_OUT
                : AUDIT_ACTIONS.STOCK_ADJUSTMENT;

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
              auditAction,
            entityType:
              "StockMovement",
            entityId:
              movement.id,
            description:
              `Stock ${type.toLowerCase()} movement recorded.`,
            oldValues: {
              productId,
              productName:
                product.name,
              stock:
                previousStock,
            },
            newValues: {
              productId,
              productName:
                product.name,
              movementId:
                movement.id,
              movementType:
                type,
              quantity,
              previousStock,
              newStock,
              note:
                note || null,
            },
            referenceType:
              "Product",
            referenceId:
              productId,
          });

          return {
            product:
              updatedProduct,
            movement,
          };
        }
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Stock updated successfully",
        data: result,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Stock update error:",
      error
    );

    if (
      error instanceof Error
    ) {
      if (
        error.message ===
        "PRODUCT_NOT_FOUND"
      ) {
        return NextResponse.json(
          {
            error:
              "Product not found",
          },
          {
            status: 404,
          }
        );
      }

      if (
        error.message ===
        "INSUFFICIENT_STOCK"
      ) {
        return NextResponse.json(
          {
            error:
              "Insufficient stock",
          },
          {
            status: 400,
          }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "Failed to update stock",
      },
      {
        status: 500,
      }
    );
  }
}