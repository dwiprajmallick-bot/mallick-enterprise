import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentAdminUser } from "@/lib/audit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    await requireCurrentAdminUser();

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Return ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const salesReturn =
      await prisma.salesReturn.findUnique({
        where: {
          id,
        },
      });

    if (!salesReturn) {
      return NextResponse.json(
        {
          error: "Sales return not found.",
        },
        {
          status: 404,
        }
      );
    }

    const [order, customer, items] =
      await Promise.all([
        prisma.order.findUnique({
          where: {
            id: salesReturn.orderId,
          },
          select: {
            id: true,
            orderNumber: true,
            subtotal: true,
            deliveryCharge: true,
            gstAmount: true,
            totalAmount: true,
            paymentStatus: true,
            orderStatus: true,
            createdAt: true,
          },
        }),

        prisma.customer.findUnique({
          where: {
            id: salesReturn.customerId,
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            companyName: true,
            gstin: true,
          },
        }),

        prisma.salesReturnItem.findMany({
          where: {
            returnId: salesReturn.id,
          },
          orderBy: {
            createdAt: "asc",
          },
        }),
      ]);

    const productIds = [
      ...new Set(
        items.map(
          (item) => item.productId
        )
      ),
    ];

    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: {
              id: {
                in: productIds,
              },
            },
            select: {
              id: true,
              name: true,
              sku: true,
            },
          })
        : [];

    const productMap = new Map(
      products.map((product) => [
        product.id,
        product,
      ])
    );

    const result = {
      ...salesReturn,

      order: order || null,

      customer: customer || null,

      items: items.map((item) => ({
        ...item,

        product:
          productMap.get(
            item.productId
          ) || null,
      })),
    };

    return NextResponse.json({
      return: result,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/returns/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load sales return.",
      },
      {
        status: 500,
      }
    );
  }
}