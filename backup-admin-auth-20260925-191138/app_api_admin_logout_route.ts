import { NextResponse } from "next/server";
import {
  revokeCurrentAdminSession,
} from "@/lib/admin-auth";

export async function POST(
  request: Request
) {
  try {
    await revokeCurrentAdminSession({
      request,
    });

    const response =
      NextResponse.json({
        success: true,
      });

    /*
     * Remove the old compatibility cookie.
     */
    response.cookies.set(
      "officekart_admin",
      "",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Admin logout error:",
      error
    );

    const response =
      NextResponse.json({
        success: true,
      });

    response.cookies.set(
      "officekart_admin",
      "",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }
    );

    return response;
  }
}