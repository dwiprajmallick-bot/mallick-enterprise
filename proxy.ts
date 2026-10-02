import {
  NextRequest,
  NextResponse,
} from "next/server";

const SESSION_COOKIE =
  "officekart_admin_session";

export function proxy(
  request: NextRequest
) {
  const { pathname } =
    request.nextUrl;

  /*
   * Login page must stay public.
   */
  if (pathname === "/admin/login") {
    const response =
      NextResponse.next();

    /*
     * Legacy cookie is never trusted.
     * Remove it when possible.
     */
    response.cookies.delete(
      "officekart_admin"
    );

    return response;
  }

  /*
   * Protect administrator UI routes.
   *
   * This is only a first-line route guard.
   * Real authorization remains server-side
   * through requireCurrentAdminUser().
   */
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    const sessionCookie =
      request.cookies.get(
        SESSION_COOKIE
      )?.value;

    if (!sessionCookie) {
      const loginUrl =
        new URL(
          "/admin/login",
          request.url
        );

      loginUrl.searchParams.set(
        "next",
        pathname
      );

      return NextResponse.redirect(
        loginUrl
      );
    }

    const response =
      NextResponse.next();

    /*
     * Never allow old compatibility
     * cookie to be used as auth.
     */
    response.cookies.delete(
      "officekart_admin"
    );

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
  ],
};