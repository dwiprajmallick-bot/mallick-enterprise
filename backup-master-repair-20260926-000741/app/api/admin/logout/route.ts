import { NextResponse } from "next/server";

import {
  revokeCurrentAdminSession,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    await revokeCurrentAdminSession({
      request,
    });

    const response = NextResponse.json({
      success: true,
      message: "Logout successful.",
    });

    response.cookies.delete("officekart_admin");

    return response;
  } catch (error) {
    console.error("Admin logout error:", error);

    const response = NextResponse.json(
      {
        success: false,
        message: "Logout completed with cleanup warning.",
      },
      { status: 200 }
    );

    response.cookies.delete("officekart_admin");

    return response;
  }
}