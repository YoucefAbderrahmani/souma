"use client";

import { useMemo, useState } from "react";
import { readJsonResponse } from "@/lib/admin-api-response";
import { isPrivilegedAdminEmail } from "@/lib/privileged-admin-emails";
import {
  USER_ROLES,
  normalizeUserRole,
  roleDisplayLabel,
  type UserRole,
} from "@/lib/user-roles";

export type RoleManagementUser = {
  id: string;
  name: string;
  lastname: string;
  email: string;
  role: string;
  createdAt: string;
};

type Props = {
  users: RoleManagementUser[];
  actorEmail?: string | null;
};

const ASSIGNABLE_FOR_ADMIN: UserRole[] = ["user", "seller"];
const ASSIGNABLE_FOR_PRIVILEGED: UserRole[] = ["user", "seller", "admin"];

export default function AdminRoleManagementPanel({ users, actorEmail }: Props) {
  const [rows, setRows] = useState(users);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignableRoles = isPrivilegedAdminEmail(actorEmail)
    ? ASSIGNABLE_FOR_PRIVILEGED
    : ASSIGNABLE_FOR_ADMIN;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) =>
      `${u.name} ${u.lastname} ${u.email} ${u.role}`.toLowerCase().includes(q)
    );
  }, [rows, query]);

  async function updateRole(userId: string, role: UserRole) {
    setBusyId(userId);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await readJsonResponse<{ error?: string; role?: string }>(
        res,
        "Update user role"
      );
      if (!res.ok) {
        setError(data.error ?? "Failed to update role");
        return;
      }
      setRows((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: data.role ?? role } : u))
      );
      setMessage(`Role updated to ${roleDisplayLabel(role)}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-orange/20 bg-orange/5 p-4 text-sm text-dark-3">
        <p className="font-medium text-dark">Role management (admins only)</p>
        <p className="mt-1">
          <strong>Seller</strong> — full admin panel and Seller Helper, but cannot assign roles.
          <strong className="ml-2">Admin</strong> — same as seller plus this tab.
          <strong className="ml-2">User</strong> — storefront account only.
        </p>
        {!isPrivilegedAdminEmail(actorEmail) ?
          <p className="mt-2 text-xs text-dark-4">
            Only privileged operators can grant the <strong>admin</strong> role.
          </p>
        : null}
      </div>

      {message ?
        <p className="rounded-md border border-green-light-3 bg-green-light-6 px-3 py-2 text-sm text-green-dark">
          {message}
        </p>
      : null}
      {error ?
        <p className="rounded-md border border-red-light-3 bg-red-light-6 px-3 py-2 text-sm text-red-dark">
          {error}
        </p>
      : null}

      <div className="rounded-lg border border-gray-3 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium text-dark">Assign roles</h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-md border border-gray-3 px-3 py-2 text-sm sm:w-[280px]"
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-3 text-xs uppercase tracking-wide text-dark-4">
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Current</th>
                <th className="pb-3 font-medium">Change role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const protectedUser = isPrivilegedAdminEmail(u.email);
                const current = normalizeUserRole(u.role);
                const canEditRole =
                  !protectedUser &&
                  (current !== "admin" || assignableRoles.includes("admin"));
                return (
                  <tr key={u.id} className="border-b border-gray-2 last:border-0">
                    <td className="py-3 pr-4">
                      {u.name} {u.lastname}
                    </td>
                    <td className="py-3 pr-4">{u.email}</td>
                    <td className="py-3 pr-4 font-medium">{roleDisplayLabel(current)}</td>
                    <td className="py-3">
                      {protectedUser ?
                        <span className="text-xs text-dark-4">Protected operator</span>
                      : canEditRole ?
                        (
                          <select
                            className="rounded-md border border-gray-3 bg-white px-2 py-1.5 text-sm"
                            value={current}
                            disabled={busyId === u.id}
                            onChange={(e) => void updateRole(u.id, e.target.value as UserRole)}
                          >
                            {assignableRoles.map((r) => (
                              <option key={r} value={r}>
                                {roleDisplayLabel(r)}
                              </option>
                            ))}
                          </select>
                        )
                      : (
                        <span className="text-xs text-dark-4">{roleDisplayLabel(current)} (fixed)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
