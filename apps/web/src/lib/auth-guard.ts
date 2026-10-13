import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";

export async function getAdminSession() {
  // Read request headers first: it opts the route into dynamic rendering before env/auth setup.
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
}

export type AdminSession = NonNullable<Awaited<ReturnType<typeof getAdminSession>>>;

/** For pages, layouts and Server Actions: redirects to the login page without a valid session. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** For Route Handlers: returns a 401 response instead of redirecting. */
export async function requireAdminApi(): Promise<AdminSession | Response> {
  const session = await getAdminSession();
  return session ?? Response.json({ error: "Não autenticado" }, { status: 401 });
}
