import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type Role = "clerk" | "supervisor";
export interface Viewer {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** The signed-in user, or null. */
export async function getViewer(): Promise<Viewer | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const role = (s.user as { role?: string }).role === "supervisor" ? "supervisor" : "clerk";
  return { id: s.user.id, name: s.user.name, email: s.user.email, role };
}

/** The signed-in user; sends anyone else to sign in. */
export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/sign-in");
  return v;
}

/** The signed-in supervisor; sends clerks back to the counter. */
export async function requireSupervisor(): Promise<Viewer> {
  const v = await requireViewer();
  if (v.role !== "supervisor") redirect("/counter");
  return v;
}
