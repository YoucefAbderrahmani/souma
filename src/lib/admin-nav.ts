/**
 * Client-side hint for showing admin navigation. Server routes still enforce `role === "admin"`.
 * Covers cookie-cached sessions where `role` may be missing until refresh, and known operator emails.
 */
const DEFAULT_ADMIN_EMAILS_LOWER = [
  "youcefyouyou201588@gmail.com",
  "belkacemimoumen235@gmail.com",
];

function adminEmailsLower(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.trim();
  if (!raw) return DEFAULT_ADMIN_EMAILS_LOWER;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function shouldShowAdminNav(
  user: { role?: string; email?: string | null } | undefined
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const email = user.email?.trim().toLowerCase();
  return email ? adminEmailsLower().includes(email) : false;
}
