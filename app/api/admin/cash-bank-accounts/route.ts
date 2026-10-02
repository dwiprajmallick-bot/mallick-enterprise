import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CASH_BANK_ACCOUNT_TYPES,
  PAYMENT_METHODS,
  makeAccountCode,
} from "@/lib/cash-bank";

export async function GET() {
  try {
    const accounts =
      await prisma.cashBankAccount.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      ok: true,
      accounts,
      accountTypes: CASH_BANK_ACCOUNT_TYPES,
      paymentMethods: PAYMENT_METHODS,
    });
  } catch (error) {
    console.error("CASH_BANK_ACCOUNTS_GET", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to load cash and bank accounts.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const accountName =
      String(body.accountName || "").trim();

    const accountType =
      String(body.accountType || "")
        .trim()
        .toUpperCase();

    if (!accountName) {
      return NextResponse.json(
        {
          ok: false,
          error: "Account name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !CASH_BANK_ACCOUNT_TYPES.includes(
        accountType as never
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid account type.",
        },
        {
          status: 400,
        }
      );
    }

    const openingBalancePaise = Math.max(
      0,
      Math.round(
        Number(body.openingBalancePaise || 0)
      )
    );

    const account =
      await prisma.cashBankAccount.create({
        data: {
          accountCode:
            String(body.accountCode || "").trim() ||
            makeAccountCode(),

          accountName,

          accountType,

          paymentMethods: body.paymentMethods
            ? JSON.stringify(
                body.paymentMethods
              )
            : null,

          bankName: body.bankName
            ? String(body.bankName).trim()
            : null,

          branchName: body.branchName
            ? String(body.branchName).trim()
            : null,

          accountNumber: body.accountNumber
            ? String(body.accountNumber).trim()
            : null,

          ifscCode: body.ifscCode
            ? String(body.ifscCode)
                .trim()
                .toUpperCase()
            : null,

          upiId: body.upiId
            ? String(body.upiId).trim()
            : null,

          openingBalancePaise,

          currentBalancePaise:
            openingBalancePaise,

          status: "ACTIVE",

          notes: body.notes
            ? String(body.notes).trim()
            : null,
        },
      });

    return NextResponse.json(
      {
        ok: true,
        account,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CASH_BANK_ACCOUNT_CREATE",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to create cash/bank account.",
      },
      {
        status: 500,
      }
    );
  }
}