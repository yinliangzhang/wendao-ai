import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/hub", "/module"];

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!needsAuth) return NextResponse.next();

  const loggedIn = Boolean(req.cookies.get("wd_auth")?.value);
  if (loggedIn) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/hub/:path*", "/module/:path*"],
};
