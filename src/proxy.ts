import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = `pos_session`;
const LOGIN_PATH = `/`;
const DASHBOARD_PATH = `/dashboard`;

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has(SESSION_COOKIE);
  const isLoginPage = pathname === LOGIN_PATH;

  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [`/((?!_next/static|_next/image|favicon.ico).*)`],
};
