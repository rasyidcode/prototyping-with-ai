export { auth as proxy } from "@/auth";

export const config = {
  // Protects all routes, including api/trpc.
  // Exclude next/image, next/static, and favicon.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
