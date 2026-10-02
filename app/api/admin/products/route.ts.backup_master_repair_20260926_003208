import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

import { requireCurrentAdminUser } from "@/lib/admin-auth";
async function isAdminAuthenticated() {
  const user =
    await requireCurrentAdminUser();

  return Boolean(user);
}

export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        sellingPrice: true,
        stock: true,
        unit: true,
      },
    });

    const data = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.sellingPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      unit: product.unit,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("ADMIN PRODUCTS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load products.",
      },
      { status: 500 }
    );
  }
}
