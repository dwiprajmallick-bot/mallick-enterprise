import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      products,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load products.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const category = String(body.category || "").trim();
    const purchasePrice = Number(body.purchasePrice);
    const sellingPrice = Number(body.sellingPrice);
    const unit = String(body.unit || "pcs").trim();
    const stock = Number(body.stock || 0);
    const image = body.image ? String(body.image) : null;
    const description = body.description
      ? String(body.description)
      : null;

    if (!name || !category) {
      return NextResponse.json(
        {
          success: false,
          message: "Product name and category are required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(purchasePrice) ||
      purchasePrice < 0 ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid price.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid stock quantity.",
        },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        category,
        purchasePrice,
        sellingPrice,
        unit,
        stock,
        image,
        description,
        active: true,
      },
    });

    return NextResponse.json({
      success: true,
      product,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create product.",
      },
      { status: 500 }
    );
  }
}