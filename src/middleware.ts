// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Redirection de mdwnext.tn → www.mdwnext.tn
function redirectToWWW(req: NextRequest) {
  const host = req.headers.get("host");
  if (host === "mdwnext.tn") {
    const url = new URL(req.url);
    url.hostname = "www.mdwnext.tn";
    return NextResponse.redirect(url.toString(), 308);
  }
  return null;
}

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/notes(.*)",
  "/projects(.*)",
  "/home(.*)",
  "/meeting(.*)",
  "/teams(.*)",
  "/rapport(.*)",
  "/profile(.*)",
]);

// Middleware principal
export default clerkMiddleware(async (auth, req: NextRequest) => {
  // 🔁 Redirection domaine
  const redirect = redirectToWWW(req);
  if (redirect) return redirect;

  // 🔐 Authentification Clerk
  const { userId, redirectToSignIn } = await auth();

  if (!userId && isProtectedRoute(req)) {
    return redirectToSignIn();
  }

  return NextResponse.next();
});

// Appliquer middleware aux routes spécifiques
export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
