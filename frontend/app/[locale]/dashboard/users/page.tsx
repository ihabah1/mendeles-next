"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import { rolesApi, usersApi, type UserRow } from "@/lib/api/dashboard";

export default function UsersPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const qc = useQueryClient();

  const canView = hasPermission("users.view");
  const canInvite = hasPermission("users.invite");
  const canEdit = hasPermission("users.edit");
  const canRemove = hasPermission("users.remove");
  const canChangeRoles = hasPermission("users.change_roles");

  const users = useQuery({ queryKey: ["users"], queryFn: usersApi.list, enabled: canView });
  const roles = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list, enabled: canChangeRoles });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [roleUser, setRoleUser] = useState<UserRow | null>(null);

  const [inviteForm, setInviteForm] = useState({ email: "", first_name: "", last_name: "", role_slug: "read_only" });
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", is_active: true });
  const [roleSlug, setRoleSlug] = useState("read_only");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const inviteMutation = useMutation({
    mutationFn: () => usersApi.invite(inviteForm),
    onSuccess: () => {
      setInviteOpen(false);
      setInviteForm({ email: "", first_name: "", last_name: "", role_slug: "read_only" });
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => usersApi.update(editUser!.id, editForm),
    onSuccess: () => {
      setEditUser(null);
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: (user: UserRow) => usersApi.update(user.id, { is_active: false }),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const assignRoleMutation = useMutation({
    mutationFn: () => usersApi.assignRole(roleUser!.id, roleSlug),
    onSuccess: () => {
      setRoleUser(null);
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => usersApi.removeRole(userId, roleId),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => usersApi.resetPassword(id),
    onSuccess: () => setMessage(t("resetPasswordSent")),
    onError: (e: Error) => setError(e.message),
  });

  const resendVerifyMutation = useMutation({
    mutationFn: (id: string) => usersApi.resendVerification(id),
    onSuccess: () => setMessage(t("verificationSent")),
    onError: (e: Error) => setError(e.message),
  });

  const forceVerifyMutation = useMutation({
    mutationFn: (id: string) => usersApi.forceVerify(id),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex flex-wrap gap-2">
          {hasPermission("tenants.view") && (
            <Link href="/dashboard/users/release">
              <Button type="button" variant="outline">
                {t("releaseEmails")}
              </Button>
            </Link>
          )}
          {canInvite && (
            <Button type="button" onClick={() => setInviteOpen(true)}>
              {t("invite")}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      <Card className="overflow-hidden p-0">
        {users.isLoading && <p className="p-6 text-sm">{tc("loading")}</p>}
        {users.isError && <p className="p-6 text-sm text-red-600">{t("loadError")}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-start text-xs uppercase tracking-wide text-[var(--muted-fg)]">
              <tr>
                <th className="px-4 py-3 font-medium">{t("colEmail")}</th>
                <th className="px-4 py-3 font-medium">{t("colName")}</th>
                <th className="px-4 py-3 font-medium">{t("colRoles")}</th>
                <th className="px-4 py-3 font-medium">{t("colVerified")}</th>
                <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
                <th className="px-4 py-3 font-medium">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.data?.results?.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--muted)]/30">
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-[var(--muted-fg)]">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.role_assignments.map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-1 rounded bg-[var(--accent-muted)] px-2 py-0.5 text-xs">
                          {r.name || r.slug}
                          {canChangeRoles && (
                            <button
                              type="button"
                              className="text-[var(--muted-fg)] hover:text-red-600"
                              aria-label={t("removeRole")}
                              onClick={() => removeRoleMutation.mutate({ userId: u.id, roleId: r.id })}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.email_verified ? "text-[var(--success)]" : "text-[var(--warning)]"}>
                      {u.email_verified ? t("verified") : t("unverified")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.is_active ? "text-[var(--success)]" : "text-[var(--muted-fg)]"}>
                      {u.is_active ? t("active") : t("inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {canEdit && (
                        <button
                          type="button"
                          className="text-xs text-[var(--accent)] hover:underline"
                          onClick={() => resetPasswordMutation.mutate(u.id)}
                        >
                          {t("resetPassword")}
                        </button>
                      )}
                      {canEdit && !u.email_verified && (
                        <>
                          <button
                            type="button"
                            className="text-xs text-[var(--accent)] hover:underline"
                            onClick={() => resendVerifyMutation.mutate(u.id)}
                          >
                            {t("resendVerification")}
                          </button>
                          <button
                            type="button"
                            className="text-xs text-[var(--success)] hover:underline"
                            onClick={() => forceVerifyMutation.mutate(u.id)}
                          >
                            {t("forceVerify")}
                          </button>
                        </>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          className="text-xs text-[var(--accent)] hover:underline"
                          onClick={() => {
                            setEditUser(u);
                            setEditForm({ first_name: u.first_name, last_name: u.last_name, is_active: u.is_active });
                            setError(null);
                          }}
                        >
                          {t("edit")}
                        </button>
                      )}
                      {canChangeRoles && (
                        <button
                          type="button"
                          className="text-xs text-[var(--accent)] hover:underline"
                          onClick={() => {
                            setRoleUser(u);
                            setRoleSlug("read_only");
                            setError(null);
                          }}
                        >
                          {t("assignRole")}
                        </button>
                      )}
                      {canEdit && u.is_active && (
                        <button
                          type="button"
                          className="text-xs text-[var(--warning)] hover:underline"
                          onClick={() => deactivateMutation.mutate(u)}
                        >
                          {t("deactivate")}
                        </button>
                      )}
                      {canRemove && (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => {
                            if (confirm(t("confirmRemove"))) removeMutation.mutate(u.id);
                          }}
                        >
                          {t("remove")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {inviteOpen && (
        <Modal title={t("inviteTitle")} onClose={() => setInviteOpen(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              inviteMutation.mutate();
            }}
          >
            <Field label={t("colEmail")}>
              <Input type="email" required value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} />
            </Field>
            <Field label={t("firstName")}>
              <Input required value={inviteForm.first_name} onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })} />
            </Field>
            <Field label={t("lastName")}>
              <Input required value={inviteForm.last_name} onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })} />
            </Field>
            <Field label={t("colRoles")}>
              <select
                className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                value={inviteForm.role_slug}
                onChange={(e) => setInviteForm({ ...inviteForm, role_slug: e.target.value })}
              >
                {roles.data?.results.map((r) => (
                  <option key={r.id} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={inviteMutation.isPending}>{t("invite")}</Button>
              <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>{tc("cancel")}</Button>
            </div>
          </form>
        </Modal>
      )}

      {editUser && (
        <Modal title={t("editTitle")} onClose={() => setEditUser(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
          >
            <Field label={t("firstName")}>
              <Input required value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
            </Field>
            <Field label={t("lastName")}>
              <Input required value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
              {t("active")}
            </label>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={updateMutation.isPending}>{tc("save")}</Button>
              <Button type="button" variant="ghost" onClick={() => setEditUser(null)}>{tc("cancel")}</Button>
            </div>
          </form>
        </Modal>
      )}

      {roleUser && (
        <Modal title={t("assignRoleTitle")} onClose={() => setRoleUser(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              assignRoleMutation.mutate();
            }}
          >
            <p className="text-sm text-[var(--muted-fg)]">{roleUser.email}</p>
            <Field label={t("colRoles")}>
              <select
                className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                value={roleSlug}
                onChange={(e) => setRoleSlug(e.target.value)}
              >
                {roles.data?.results.map((r) => (
                  <option key={r.id} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={assignRoleMutation.isPending}>{t("assignRole")}</Button>
              <Button type="button" variant="ghost" onClick={() => setRoleUser(null)}>{tc("cancel")}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-[var(--muted-fg)] hover:text-[var(--foreground)]" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--muted-fg)]">{label}</span>
      {children}
    </label>
  );
}
