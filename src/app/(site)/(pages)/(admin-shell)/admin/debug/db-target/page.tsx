import { redirect } from "next/navigation";

/**
 * Human-friendly URL: /admin/debug/db-target → same JSON as the API route.
 * The real handler lives at /api/admin/debug/db-target (App Router API).
 */
export default function AdminDebugDbTargetRedirectPage() {
  redirect("/api/admin/debug/db-target");
}
