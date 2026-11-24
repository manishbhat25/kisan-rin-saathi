import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "krs_session";

/** Fast redirect for signed-out visitors. Role and ownership checks happen on the server for every page and API call. */
export function middleware(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/farmer/:path*", "/officer/:path*", "/operator/:path*", "/notifications", "/applications/:path*"],
};
