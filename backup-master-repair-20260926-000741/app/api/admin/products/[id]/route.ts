import { requireCurrentAdminUser } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import {

  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

async function checkAdmin() {
  const user =
    await requireCurrentAdminUser();

  return Boolean(user);
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === true || value === false) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return undefined;
}

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: Context
) {
  if (!(await checkAdmin())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const { ipAddress, userAgent } = getRequestAuditMeta(request);

    await writeAuditLog({
      actorRole: "ADMIN",
      action: AUDIT_ACTIONS.VIEW,
      entityType: "Product",
      entityId: product.id,
      description: "Admin viewed product details.",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: Context
) {
  if (!(await checkAdmin())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();

    const { ipAddress, userAgent } = getRequestAuditMeta(request);

    const result = await prisma.$transaction(async (tx) => {
      const existingProduct = await tx.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const data: {
        name?: string;
        category?: string;
        purchasePrice?: number;
        sellingPrice?: number;
        unit?: string;
        stock?: number;
        image?: string | null;
        description?: string | null;
        active?: boolean;
      } = {};

      if (body.name !== undefined) {
        const name = String(body.name).trim();

        if (!name) {
          throw new Error("INVALID_PRODUCT_NAME");
        }

        data.name = name;
      }

      if (body.category !== undefined) {
        const category = String(body.category).trim();

        if (!category) {
          throw new Error("INVALID_CATEGORY");
        }

        data.category = category;
      }

      if (body.purchasePrice !== undefined) {
        const purchasePrice = Number(body.purchasePrice);

        if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
          throw new Error("INVALID_PURCHASE_PRICE");
        }

        data.purchasePrice = purchasePrice;
      }

      if (body.sellingPrice !== undefined) {
        const sellingPrice = Number(body.sellingPrice);

        if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
          throw new Error("INVALID_SELLING_PRICE");
        }

        data.sellingPrice = sellingPrice;
      }

      if (body.stock !== undefined) {
        const stock = Number(body.stock);

        if (!Number.isInteger(stock) || stock < 0) {
          throw new Error("INVALID_STOCK");
        }

        data.stock = stock;
      }

      if (body.unit !== undefined) {
        const unit = String(body.unit).trim();

        if (!unit) {
          throw new Error("INVALID_UNIT");
        }

        data.unit = unit;
      }

      if (body.image !== undefined) {
        const image = String(body.image ?? "").trim();
        data.image = image || null;
      }

      if (body.description !== undefined) {
        const description = String(body.description ?? "").trim();
        data.description = description || null;
      }

      if (body.active !== undefined) {
        const active = parseBoolean(body.active);

        if (active === undefined) {
          throw new Error("INVALID_ACTIVE");
        }

        data.active = active;
      }

      if (Object.keys(data).length === 0) {
        throw new Error("NOTHING_TO_UPDATE");
      }

      const updatedProduct = await tx.product.update({
        where: { id },
        data,
      });

      const stockChanged =
        data.stock !== undefined &&
        data.stock !== existingProduct.stock;

      let stockMovement = null;

      if (stockChanged) {
        stockMovement = await tx.stockMovement.create({
          data: {
            productId: updatedProduct.id,
            type: "ADJUSTMENT",
            quantity: updatedProduct.stock,
            previousStock: existingProduct.stock,
            newStock: updatedProduct.stock,
            note: "Product stock edited from product update.",
          },
        });

        await writeAuditLog({
          db: tx,
          actorRole: "ADMIN",
          action: AUDIT_ACTIONS.STOCK_ADJUSTMENT,
          entityType: "Product",
          entityId: updatedProduct.id,
          description: "Product stock changed during product update.",
          oldValues: {
            stock: existingProduct.stock,
          },
          newValues: {
            stock: updatedProduct.stock,
          },
          reason: "Product stock edited by admin.",
          referenceType: "StockMovement",
          referenceId: stockMovement.id,
          ipAddress,
          userAgent,
        });
      }

      await writeAuditLog({
        db: tx,
        actorRole: "ADMIN",
        action: AUDIT_ACTIONS.UPDATE,
        entityType: "Product",
        entityId: updatedProduct.id,
        description: "Product updated by admin.",
        oldValues: {
          name: existingProduct.name,
          category: existingProduct.category,
          purchasePrice: existingProduct.purchasePrice,
          sellingPrice: existingProduct.sellingPrice,
          unit: existingProduct.unit,
          stock: existingProduct.stock,
          image: existingProduct.image,
          description: existingProduct.description,
          active: existingProduct.active,
        },
        newValues: {
          name: updatedProduct.name,
          category: updatedProduct.category,
          purchasePrice: updatedProduct.purchasePrice,
          sellingPrice: updatedProduct.sellingPrice,
          unit: updatedProduct.unit,
          stock: updatedProduct.stock,
          image: updatedProduct.image,
          description: updatedProduct.description,
          active: updatedProduct.active,
        },
        ipAddress,
        userAgent,
      });

      return {
        product: updatedProduct,
        stockMovement,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Product updated successfully.",
      data: result.product,
      stockMovement: result.stockMovement,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      if (error.message === "INVALID_PRODUCT_NAME") {
        return NextResponse.json(
          { error: "Product name is required" },
          { status: 400 }
        );
      }

      if (error.message === "INVALID_CATEGORY") {
        return NextResponse.json(
          { error: "Category is required" },
          { status: 400 }
        );
      }

      if (error.message === "INVALID_PURCHASE_PRICE") {
        return NextResponse.json(
          { error: "Invalid purchase price" },
          { status: 400 }
        );
      }

      if (error.message === "INVALID_SELLING_PRICE") {
        return NextResponse.json(
          { error: "Invalid selling price" },
          { status: 400 }
        );
      }

      if (error.message === "INVALID_STOCK") {
        return NextResponse.json(
          { error: "Stock must be a non-negative integer" },
          { status: 400 }
        );
      }

      if (error.message === "INVALID_UNIT") {
        return NextResponse.json(
          { error: "Unit is required" },
          { status: 400 }
        );
      }

      if (error.message === "INVALID_ACTIVE") {
        return NextResponse.json(
          { error: "Invalid active value" },
          { status: 400 }
        );
      }

      if (error.message === "NOTHING_TO_UPDATE") {
        return NextResponse.json(
          { error: "Nothing to update" },
          { status: 400 }
        );
      }
    }

    console.error("Update product error:", error);

    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: Context
) {
  if (!(await checkAdmin())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const { ipAddress, userAgent } = getRequestAuditMeta(request);

    const result = await prisma.$transaction(async (tx) => {
      const existingProduct = await tx.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      if (!existingProduct.active) {
        return existingProduct;
      }

      const deactivatedProduct = await tx.product.update({
        where: { id },
        data: {
          active: false,
        },
      });

      await writeAuditLog({
        db: tx,
        actorRole: "ADMIN",
        action: AUDIT_ACTIONS.DELETE,
        entityType: "Product",
        entityId: deactivatedProduct.id,
        description:
          "Product soft-deleted by deactivation. Physical deletion is not performed for auditability.",
        oldValues: {
          active: existingProduct.active,
        },
        newValues: {
          active: deactivatedProduct.active,
        },
        reason:
          "Product deletion request converted to soft-delete/deactivation.",
        ipAddress,
        userAgent,
      });

      return deactivatedProduct;
    });

    return NextResponse.json({
      success: true,
      message: "Product deactivated successfully.",
      data: result,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PRODUCT_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    console.error("Delete product error:", error);

    return NextResponse.json(
      { error: "Failed to deactivate product" },
      { status: 500 }
    );
  }
}
