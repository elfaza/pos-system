import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = `pos_session`;
const LOGIN_PATH = `/`;

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has(SESSION_COOKIE);
  const isLoginPage = pathname === LOGIN_PATH;

  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [`/((?!_next/static|_next/image|favicon.ico).*)`],
};
