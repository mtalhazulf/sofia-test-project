import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isAuthed = !!req.auth?.user;
  const isLogin = pathname === "/login";

  if (!isAuthed && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return Response.redirect(url);
  }
  if (isAuthed && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/clients";
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
