import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Todo menos archivos estáticos e imágenes
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|robots.txt|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
