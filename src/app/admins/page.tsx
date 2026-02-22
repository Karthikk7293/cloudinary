"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import { apiFetch } from "@/lib/api-client";
import type { AppUser, UserRole, UserStatus } from "@/types";

export default function AdminsPage() {
  const { role: currentRole } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const res = await apiFetch<{ users: AppUser[] }>("/api/admins/list");
      if (res.data) setUsers(res.data.users);
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Failed to load users"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(
    targetUid: string,
    updates: {
      role?: UserRole;
      status?: UserStatus;
      access?: Partial<AppUser["access"]>;
    }
  ) {
    setUpdatingUid(targetUid);
    try {
      await apiFetch("/api/admins/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid, ...updates }),
      });
      addToast("success", "User updated");
      loadUsers();
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Update failed"
      );
    } finally {
      setUpdatingUid(null);
    }
  }

  if (currentRole !== "SUPER_ADMIN") {
    return (
      <p className="text-sm text-gray-500">
        Only super admins can access this page.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading users...</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        User Management
      </h1>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-light dark:border-border-dark">
              <th className="pb-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                Email
              </th>
              <th className="pb-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                Role
              </th>
              <th className="pb-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="pb-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                Upload
              </th>
              <th className="pb-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                Delete
              </th>
              <th className="pb-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                Folders
              </th>
              <th className="pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {users.map((u) => (
              <tr key={u.uid}>
                <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                  {u.email}
                </td>
                <td className="py-3 pr-4">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      handleUpdate(u.uid, {
                        role: e.target.value as UserRole,
                      })
                    }
                    disabled={updatingUid === u.uid}
                    className="rounded border border-border-light bg-white px-2 py-1 text-xs dark:border-border-dark dark:bg-dark-bg dark:text-gray-200"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEDIA_MANAGER">MEDIA_MANAGER</option>
                  </select>
                </td>
                <td className="py-3 pr-4">
                  <button
                    onClick={() =>
                      handleUpdate(u.uid, {
                        status:
                          u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                      })
                    }
                    disabled={updatingUid === u.uid}
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      u.status === "ACTIVE"
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {u.status}
                  </button>
                </td>
                <td className="py-3 pr-4">
                  <AccessToggle
                    value={u.access.canUpload}
                    disabled={updatingUid === u.uid}
                    onChange={(v) =>
                      handleUpdate(u.uid, {
                        access: { ...u.access, canUpload: v },
                      })
                    }
                  />
                </td>
                <td className="py-3 pr-4">
                  <AccessToggle
                    value={u.access.canDelete}
                    disabled={updatingUid === u.uid}
                    onChange={(v) =>
                      handleUpdate(u.uid, {
                        access: { ...u.access, canDelete: v },
                      })
                    }
                  />
                </td>
                <td className="py-3 pr-4">
                  <AccessToggle
                    value={u.access.canCreateFolder}
                    disabled={updatingUid === u.uid}
                    onChange={(v) =>
                      handleUpdate(u.uid, {
                        access: { ...u.access, canCreateFolder: v },
                      })
                    }
                  />
                </td>
                <td className="py-3">
                  {updatingUid === u.uid && (
                    <span className="text-xs text-gray-400">Saving...</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccessToggle({
  value,
  disabled,
  onChange,
}: {
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`h-5 w-9 rounded-full transition-colors ${
        value ? "bg-success" : "bg-gray-300 dark:bg-gray-600"
      } relative disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          value ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
