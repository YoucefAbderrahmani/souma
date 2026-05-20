"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { RecommendationRoleEmailDto } from "@/types/conception-admin";
import { readJsonResponse } from "@/lib/admin-api-response";
import { normalizeRoleKey } from "@/lib/recommendation-roles";

export default function RecommendationRoleEmailsPanel() {
  const [roles, setRoles] = useState<RecommendationRoleEmailDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleKey, setRoleKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/recommendation-role-emails", {
        credentials: "include",
        cache: "no-store",
      });
      const body = await readJsonResponse<{ roles?: RecommendationRoleEmailDto[]; error?: string }>(
        res,
        "Role emails API"
      );
      if (!res.ok) throw new Error(body.error || "Failed to load roles");
      setRoles(body.roles ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRole = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/recommendation-role-emails", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleKey, displayName, email }),
      });
      const body = await readJsonResponse<{ roles?: RecommendationRoleEmailDto[]; error?: string }>(
        res,
        "Role emails API"
      );
      if (!res.ok) throw new Error(body.error || "Save failed");
      setRoles(body.roles ?? []);
      setRoleKey("");
      setDisplayName("");
      setEmail("");
      toast.success("Role email saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updateExisting = async (row: RecommendationRoleEmailDto) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/recommendation-role-emails", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleKey: row.roleKey,
          displayName: row.displayName,
          email: row.email,
        }),
      });
      const body = await readJsonResponse<{ roles?: RecommendationRoleEmailDto[]; error?: string }>(
        res,
        "Role emails API"
      );
      if (!res.ok) throw new Error(body.error || "Update failed");
      setRoles(body.roles ?? []);
      toast.success(`Updated ${row.displayName}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async (key: string) => {
    if (!window.confirm(`Remove role "${key}"?`)) return;
    try {
      const res = await fetch(
        `/api/admin/recommendation-role-emails?roleKey=${encodeURIComponent(key)}`,
        { method: "DELETE", credentials: "include" }
      );
      const body = await readJsonResponse<{ roles?: RecommendationRoleEmailDto[]; error?: string }>(
        res,
        "Role emails API"
      );
      if (!res.ok) throw new Error(body.error || "Delete failed");
      setRoles(body.roles ?? []);
      toast.success("Role removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-gray-3 bg-white p-5 shadow-1 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold text-dark">Assign role emails</h2>
        <p className="mt-1 text-custom-sm text-dark-4">
          Map roles to inboxes for AI recommendations. The analyzer assigns each recommendation to the
          best role; sellers can email that role from Seller Helper.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-gray-3 bg-gray-1 p-4 sm:grid-cols-3">
        <label className="space-y-1 text-custom-sm">
          <span className="font-medium text-dark">Role key</span>
          <input
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value)}
            placeholder="e.g. marketing_agent"
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 outline-none focus:border-orange focus:ring-2 focus:ring-orange/15"
          />
        </label>
        <label className="space-y-1 text-custom-sm">
          <span className="font-medium text-dark">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Marketing agent"
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 outline-none focus:border-orange focus:ring-2 focus:ring-orange/15"
          />
        </label>
        <label className="space-y-1 text-custom-sm">
          <span className="font-medium text-dark">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="team@example.com"
            className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 outline-none focus:border-orange focus:ring-2 focus:ring-orange/15"
          />
        </label>
        <div className="sm:col-span-3 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveRole()}
            className="rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-blue-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add / update role"}
          </button>
        </div>
      </div>

      {loading ?
        <p className="text-custom-sm text-dark-4">Loading roles…</p>
      : roles.length === 0 ?
        <p className="text-custom-sm text-dark-4">No roles yet.</p>
      : <div className="overflow-x-auto rounded-lg border border-gray-3">
          <table className="min-w-full text-left text-custom-sm">
            <thead className="border-b border-gray-3 bg-gray-1 text-xs uppercase tracking-wide text-dark-4">
              <tr>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((row) => (
                <RoleRowEditor
                  key={row.roleKey}
                  row={row}
                  disabled={saving}
                  onSave={updateExisting}
                  onDelete={removeRole}
                />
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
}

function RoleRowEditor({
  row,
  disabled,
  onSave,
  onDelete,
}: {
  row: RecommendationRoleEmailDto;
  disabled: boolean;
  onSave: (row: RecommendationRoleEmailDto) => void;
  onDelete: (key: string) => void;
}) {
  const [displayName, setDisplayName] = useState(row.displayName);
  const [email, setEmail] = useState(row.email);

  return (
    <tr className="border-b border-gray-2 last:border-0">
      <td className="px-4 py-3 font-medium text-dark">{displayName}</td>
      <td className="px-4 py-3 font-mono text-xs text-dark-4">{row.roleKey}</td>
      <td className="px-4 py-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full min-w-[200px] rounded-md border border-gray-3 px-2 py-1.5"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSave({ ...row, displayName, email, roleKey: normalizeRoleKey(row.roleKey) })}
            className="rounded-md border border-gray-3 px-2 py-1 text-xs font-medium hover:border-orange hover:text-orange"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => onDelete(row.roleKey)}
            className="rounded-md border border-gray-3 px-2 py-1 text-xs font-medium text-red-dark hover:border-red"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
