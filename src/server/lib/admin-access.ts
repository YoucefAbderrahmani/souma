const DEFAULT_ADMIN_EMAILS_LOWER = [
  "youcefyouyou201588@gmail.com",
  "belkacemimoumen235@gmail.com",
];

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function adminEmailsLower(): string[] {
  const combined = [
    ...parseList(process.env.ADMIN_EMAILS),
    ...parseList(process.env.NEXT_PUBLIC_ADMIN_EMAILS),
    ...DEFAULT_ADMIN_EMAILS_LOWER,
  ];
  return Array.from(new Set(combined));
}

export function isPrivilegedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailsLower().includes(email.trim().toLowerCase());
}

