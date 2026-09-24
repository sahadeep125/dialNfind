import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, Loader2, MoreHorizontal, Pencil, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatRelative, initials } from "@/lib/format";
import { email, personName } from "@/lib/validation";
import { useAuth } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton } from "@/components/common";
import { ConfirmDialog, StatusBadge } from "@/components/admin-ui";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Member {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "super_admin" | "admin";
  status: "active" | "suspended";
  lastLoginAt: string | null;
  createdAt: string;
  adminRole: { id: number; name: string } | null;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
  _count: { users: number };
}

interface ModuleDef {
  key: string;
  label: string;
  description: string;
}

export function TeamPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const team = useQuery({ queryKey: ["team"], queryFn: () => api<{ members: Member[] }>("/admin/team") });
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => api<{ roles: Role[]; modules: ModuleDef[] }>("/admin/roles") });
  const [inviting, setInviting] = useState(false);
  const [password, setPassword] = useState<{ name: string; email: string; password: string } | null>(null);
  const [roleEdit, setRoleEdit] = useState<Role | "new" | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "suspend" | "activate" | "remove" | "reset"; member: Member } | null>(null);
  const [roleDelete, setRoleDelete] = useState<Role | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["team"] });
    void qc.invalidateQueries({ queryKey: ["roles"] });
  };

  const updateMember = useMutation({
    mutationFn: ({ id, json }: { id: number; json: { roleId?: number; status?: "active" | "suspended" } }) => api(`/admin/team/${id}`, { method: "PATCH", json }),
    onSuccess: () => {
      toast.success("Team member updated");
      setConfirm(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const removeMember = useMutation({
    mutationFn: (id: number) => api(`/admin/team/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Removed from the team");
      setConfirm(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const resetPassword = useMutation({
    mutationFn: (m: Member) => api<{ temporaryPassword: string }>(`/admin/team/${m.id}/reset-password`, { method: "POST" }),
    onSuccess: (r, m) => {
      setConfirm(null);
      setPassword({ name: m.name, email: m.email, password: r.temporaryPassword });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const deleteRole = useMutation({
    mutationFn: (id: number) => api(`/admin/roles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Role deleted");
      setRoleDelete(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!team.data || !roles.data) return <PageSkeleton />;
  const moduleLabel = new Map(roles.data.modules.map((m) => [m.key, m.label]));

  return (
    <>
      <PageHeader
        title="Team"
        description="People who can sign in to this console. Each member gets a role that decides which sections they can open."
        actions={
          <Button onClick={() => setInviting(true)} disabled={!roles.data.roles.length}>
            <UserPlus /> Add member
          </Button>
        }
      />
      <div className="space-y-6">
        <Panel title="Members">
          <ul className="divide-y">
            {team.data.members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">{initials(m.name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    {m.id === me?.id && <span className="text-xs text-muted-foreground">(you)</span>}
                    {m.status === "suspended" && <StatusBadge status="suspended" />}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">{m.email}</div>
                </div>
                <div className="w-full text-xs text-muted-foreground sm:w-36">{m.lastLoginAt ? `Signed in ${formatRelative(m.lastLoginAt)}` : "Never signed in"}</div>
                {m.role === "super_admin" ? (
                  <span className="inline-flex w-44 items-center gap-1.5 text-sm font-medium text-primary">
                    <ShieldCheck className="size-4" /> Super admin
                  </span>
                ) : (
                  <Select value={m.adminRole ? String(m.adminRole.id) : undefined} onValueChange={(v) => updateMember.mutate({ id: m.id, json: { roleId: Number(v) } })}>
                    <SelectTrigger className="w-44" aria-label={`Role for ${m.name}`}>
                      <SelectValue placeholder="No role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.data.roles.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="w-8">
                  {m.role === "admin" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${m.name}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setConfirm({ kind: "reset", member: m })}>
                          <KeyRound /> Reset password
                        </DropdownMenuItem>
                        {m.status === "active" ? (
                          <DropdownMenuItem onSelect={() => setConfirm({ kind: "suspend", member: m })}>Suspend access</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => setConfirm({ kind: "activate", member: m })}>Restore access</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => setConfirm({ kind: "remove", member: m })}>
                          <Trash2 /> Remove from team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Roles"
          description="Super admins can open everything, including this page. Roles control what everyone else sees."
          actions={
            <Button size="sm" variant="outline" onClick={() => setRoleEdit("new")}>
              <Plus /> New role
            </Button>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {roles.data.roles.map((r) => (
              <div key={r.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r._count.users} member{r._count.users === 1 ? "" : "s"}
                      {r.description ? ` · ${r.description}` : ""}
                    </div>
                  </div>
                  <div className="flex">
                    <Button variant="ghost" size="icon-sm" onClick={() => setRoleEdit(r)} aria-label={`Edit ${r.name}`}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setRoleDelete(r)} aria-label={`Delete ${r.name}`}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.permissions.map((p) => (
                    <span key={p} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                      {moduleLabel.get(p) ?? p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {inviting && (
        <InviteDialog
          roles={roles.data.roles}
          onClose={() => setInviting(false)}
          onInvited={(r) => {
            setInviting(false);
            setPassword(r);
            refresh();
          }}
        />
      )}
      {password && <PasswordDialog {...password} onClose={() => setPassword(null)} />}
      {roleEdit && <RoleDialog role={roleEdit === "new" ? null : roleEdit} modules={roles.data.modules} onClose={() => setRoleEdit(null)} onSaved={refresh} />}
      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          busy={updateMember.isPending || removeMember.isPending || resetPassword.isPending}
          destructive={confirm.kind === "remove" || confirm.kind === "suspend"}
          {...{
            suspend: { title: `Suspend ${confirm.member.name}?`, description: "They are signed out and cannot sign in until you restore access.", confirmLabel: "Suspend", onConfirm: () => updateMember.mutate({ id: confirm.member.id, json: { status: "suspended" } }) },
            activate: { title: `Restore access for ${confirm.member.name}?`, description: "They can sign in again with their current password.", confirmLabel: "Restore access", onConfirm: () => updateMember.mutate({ id: confirm.member.id, json: { status: "active" } }) },
            remove: { title: `Remove ${confirm.member.name} from the team?`, description: "Their account becomes a regular customer account and their open tickets go back to the unassigned queue. Their past actions stay in the audit log.", confirmLabel: "Remove", onConfirm: () => removeMember.mutate(confirm.member.id) },
            reset: { title: `Reset the password for ${confirm.member.name}?`, description: "Their current password stops working. You get a temporary password to share with them.", confirmLabel: "Reset password", onConfirm: () => resetPassword.mutate(confirm.member) },
          }[confirm.kind]}
        />
      )}
      {roleDelete && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setRoleDelete(null)}
          title={`Delete the ${roleDelete.name} role?`}
          description={roleDelete._count.users ? `Move its ${roleDelete._count.users} member${roleDelete._count.users === 1 ? "" : "s"} to another role first.` : "No one has this role, so nothing else changes."}
          confirmLabel="Delete role"
          destructive
          busy={deleteRole.isPending}
          onConfirm={() => deleteRole.mutate(roleDelete.id)}
        />
      )}
    </>
  );
}

const inviteSchema = z.object({ name: personName, email, roleId: z.string().min(1, "Choose a role") });
type InviteValues = z.infer<typeof inviteSchema>;

function InviteDialog({ roles, onClose, onInvited }: { roles: Role[]; onClose: () => void; onInvited: (r: { name: string; email: string; password: string }) => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, control, handleSubmit, formState } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { name: "", email: "", roleId: "" }, mode: "onTouched" });
  const { errors } = formState;
  const invite = useMutation({
    mutationFn: (v: InviteValues) => api<{ temporaryPassword: string }>("/admin/team", { method: "POST", json: { name: v.name.trim(), email: v.email.trim(), roleId: Number(v.roleId) } }),
    onSuccess: (r, v) => onInvited({ name: v.name, email: v.email, password: r.temporaryPassword }),
    onError: (e) => setServerError(errorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a team member</DialogTitle>
          <DialogDescription>They get a temporary password to sign in with. An existing customer account with this email is upgraded.</DialogDescription>
        </DialogHeader>
        <form id="invite-form" className="space-y-4" noValidate onSubmit={handleSubmit((v) => (setServerError(null), invite.mutate(v)))}>
          <FormAlert message={serverError} />
          <Field id="invite-name" label="Full name" error={errors.name} required>
            <Input autoComplete="off" {...fieldA11y("invite-name", errors.name)} {...register("name")} />
          </Field>
          <Field id="invite-email" label="Work email" error={errors.email} required>
            <Input type="email" autoComplete="off" {...fieldA11y("invite-email", errors.email)} {...register("email")} />
          </Field>
          <Field id="invite-role" label="Role" error={errors.roleId} required>
            <Controller
              control={control}
              name="roleId"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger id="invite-role" className="w-full" aria-invalid={!!errors.roleId || undefined} aria-describedby={errors.roleId ? "invite-role-error" : undefined}>
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="invite-form" disabled={invite.isPending}>
            {invite.isPending && <Loader2 className="animate-spin" />} Add member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ name, email, password, onClose }: { name: string; email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      toast.error("Could not copy. Select the password and copy it manually.");
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Temporary password for {name}</DialogTitle>
          <DialogDescription>Share it with them privately. It is shown only once. They sign in with {email} and should change it from My account.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-xl border bg-muted/50 p-3">
          <code className="flex-1 select-all break-all font-mono text-base font-semibold">{password}</code>
          <Button type="button" size="sm" variant="outline" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const roleSchema = z.object({
  name: z.string().trim().min(2, "Enter a role name").max(40, "Keep the name under 40 characters"),
  description: z.string().trim().max(200, "Keep the description under 200 characters"),
  permissions: z.array(z.string()).min(1, "Pick at least one section"),
});
type RoleValues = z.infer<typeof roleSchema>;

function RoleDialog({ role, modules, onClose, onSaved }: { role: Role | null; modules: ModuleDef[]; onClose: () => void; onSaved: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, control, handleSubmit, formState } = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: role?.name ?? "", description: role?.description ?? "", permissions: role?.permissions ?? [] },
    mode: "onTouched",
  });
  const { errors } = formState;
  const save = useMutation({
    mutationFn: (v: RoleValues) => {
      const json = { name: v.name.trim(), description: v.description.trim() || null, permissions: v.permissions };
      return role ? api(`/admin/roles/${role.id}`, { method: "PATCH", json }) : api("/admin/roles", { method: "POST", json });
    },
    onSuccess: () => {
      toast.success(role ? "Role updated" : "Role created");
      onSaved();
      onClose();
    },
    onError: (e) => setServerError(errorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{role ? `Edit ${role.name}` : "New role"}</DialogTitle>
          <DialogDescription>Choose the sections people with this role can open. Changes apply the next time they load a page.</DialogDescription>
        </DialogHeader>
        <form id="role-form" className="space-y-4" noValidate onSubmit={handleSubmit((v) => (setServerError(null), save.mutate(v)))}>
          <FormAlert message={serverError} />
          <Field id="role-name" label="Role name" error={errors.name} required>
            <Input placeholder="e.g. Content moderator" {...fieldA11y("role-name", errors.name)} {...register("name")} />
          </Field>
          <Field id="role-desc" label="Description" error={errors.description} optional>
            <Textarea rows={2} {...fieldA11y("role-desc", errors.description)} {...register("description")} />
          </Field>
          <Field id="role-perms" label="Sections" error={errors.permissions?.message} required>
            <Controller
              control={control}
              name="permissions"
              render={({ field }) => (
                <div id="role-perms" role="group" aria-describedby={errors.permissions ? "role-perms-error" : undefined} className="grid gap-2 sm:grid-cols-2">
                  {modules.map((m) => {
                    const checked = field.value.includes(m.key);
                    return (
                      <label key={m.key} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 hover:bg-muted/40 has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-accent/50">
                        <Checkbox checked={checked} onCheckedChange={(c) => field.onChange(c ? [...field.value, m.key] : field.value.filter((k) => k !== m.key))} className="mt-0.5" />
                        <span>
                          <span className="block text-sm font-medium">{m.label}</span>
                          <span className="block text-xs text-muted-foreground">{m.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </Field>
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="role-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {role ? "Save role" : "Create role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
