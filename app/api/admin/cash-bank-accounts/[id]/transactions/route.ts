import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PAYMENT_METHODS,
  makeTransactionNumber,
} from "@/lib/cash-bank";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    const account =
      await prisma.cashBankAccount.findUnique({
        where: {
          id,
        },
      });

    if (!account) {
      return NextResponse.json(
        {
          ok: false,
          error: "Account not found.",
        },
        {
          status: 404,
        }
      );
    }

    const transactions =
      await prisma.cashBankTransaction.findMany({
        where: {
          accountId: id,
        },
        orderBy: {
          transactionDate: "desc",
        },
        take: 500,
      });

    return NextResponse.json({
      ok: true,
      account,
      transactions,
    });
  } catch (error) {
    console.error(
      "CASH_BANK_TRANSACTIONS_GET",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to load account transactions.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const account =
      await prisma.cashBankAccount.findUnique({
        where: {
          id,
        },
      });

    if (!account) {
      return NextResponse.json(
        {
          ok: false,
          error: "Account not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (account.status !== "ACTIVE") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only active accounts can receive transactions.",
        },
        {
          status: 400,
        }
      );
    }

    const amountPaise =
      Math.round(
        Number(body.amountPaise || 0)
      );

    if (
      !Number.isFinite(amountPaise) ||
      amountPaise <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Amount must be greater than zero.",
        },
        {
          status: 400,
        }
      );
    }

    const direction =
      String(body.direction || "")
        .trim()
        .toUpperCase();

    if (
      direction !== "IN" &&
      direction !== "OUT"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Direction must be IN or OUT.",
        },
        {
          status: 400,
        }
      );
    }

    const paymentMethod =
      String(body.paymentMethod || "")
        .trim()
        .toUpperCase();

    if (
      !PAYMENT_METHODS.includes(
        paymentMethod as never
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid payment method.",
        },
        {
          status: 400,
        }
      );
    }

    const signedAmount =
      direction === "IN"
        ? amountPaise
        : -amountPaise;

    const result =
      await prisma.$transaction(
        async (tx) => {

          const transaction =
            await tx.cashBankTransaction.create({
              data: {
                transactionNumber:
                  makeTransactionNumber(),

                accountId: id,

                transactionType:
                  String(
                    body.transactionType ||
                      "MANUAL"
                  )
                    .trim()
                    .toUpperCase(),

                amountPaise,

                paymentMethod,

                transactionDate:
                  body.transactionDate
                    ? new Date(
                        body.transactionDate
                      )
                    : new Date(),

                referenceNumber:
                  body.referenceNumber
                    ? String(
                        body.referenceNumber
                      ).trim()
                    : null,

                externalReference:
                  body.externalReference
                    ? String(
                        body.externalReference
                      ).trim()
                    : null,

                partyType:
                  body.partyType
                    ? String(
                        body.partyType
                      )
                        .trim()
                        .toUpperCase()
                    : null,

                partyId:
                  body.partyId
                    ? String(
                        body.partyId
                      ).trim()
                    : null,

                customerId:
                  body.customerId
                    ? String(
                        body.customerId
                      ).trim()
                    : null,

                supplierId:
                  body.supplierId
                    ? String(
                        body.supplierId
                      ).trim()
                    : null,

                orderId:
                  body.orderId
                    ? String(
                        body.orderId
                      ).trim()
                    : null,

                purchaseId:
                  body.purchaseId
                    ? String(
                        body.purchaseId
                      ).trim()
                    : null,

                paymentId:
                  body.paymentId
                    ? String(
                        body.paymentId
                      ).trim()
                    : null,

                supplierPaymentId:
                  body.supplierPaymentId
                    ? String(
                        body.supplierPaymentId
                      ).trim()
                    : null,

                direction,

                status: "POSTED",

                description:
                  body.description
                    ? String(
                        body.description
                      ).trim()
                    : null,
              },
            });

          const updatedAccount =
            await tx.cashBankAccount.update({
              where: {
                id,
              },

              data: {
                currentBalancePaise: {
                  increment:
                    signedAmount,
                },
              },
            });

          return {
            transaction,
            updatedAccount,
          };
        }
      );

    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CASH_BANK_TRANSACTION_CREATE",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to post account transaction.",
      },
      {
        status: 500,
      }
    );
  }
}