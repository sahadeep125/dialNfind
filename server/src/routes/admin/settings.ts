import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { parse } from "../../lib/validate.js";
import { badRequest } from "../../lib/errors.js";
import { currentUser } from "../../middleware/auth.js";
import { logAdmin } from "../../services/audit.js";
import { maskSecret, PLUGINS, pluginKey, SETTING_FIELDS, SETTING_GROUPS, type SettingField } from "../../services/settings.js";

/** Platform settings and third-party plugins. Secrets are write-only: the API returns a masked hint. */
export const adminSettingsRouter = Router();

function present(field: SettingField, key: string, values: Map<string, string>) {
  const raw = values.get(key);
  const isSet = raw !== undefined && raw !== "";
  return {
    ...field,
    key,
    isSet,
    value: field.type === "secret" ? (isSet ? maskSecret(raw!) : "") : (raw ?? field.default ?? ""),
  };
}

adminSettingsRouter.get("/settings", async (_req, res) => {
  const rows = await prisma.setting.findMany();
  const values = new Map(rows.map((r) => [r.key, r.value]));
  const known = new Set(SETTING_FIELDS.keys());
  res.json({
    groups: SETTING_GROUPS.map((g) => ({ ...g, fields: g.fields.map((f) => present(f, f.key, values)) })),
    plugins: PLUGINS.map((p) => {
      const fields = p.fields.map((f) => present(f, pluginKey(p.key, f.key), values));
      const enabled = values.get(pluginKey(p.key, "enabled")) === "true";
      const configured = fields.filter((f) => f.type === "secret").every((f) => f.isSet);
      return { ...p, fields, enabled, configured, active: enabled && configured };
    }),
    // Keys written by older code or scripts that are not in the registry, shown read-only.
    other: rows.filter((r) => !known.has(r.key)).map((r) => ({ key: r.key, value: r.value, updatedAt: r.updatedAt })),
  });
});

function check(field: SettingField, key: string, value: string): string {
  const v = value.trim();
  if (v === "") return "";
  switch (field.type) {
    case "number": {
      const n = Number(v);
      if (!Number.isFinite(n)) throw badRequest(`${field.label} must be a number`);
      if (field.min !== undefined && n < field.min) throw badRequest(`${field.label} must be at least ${field.min}`);
      if (field.max !== undefined && n > field.max) throw badRequest(`${field.label} must be at most ${field.max}`);
      return String(n);
    }
    case "boolean":
      if (v !== "true" && v !== "false") throw badRequest(`${field.label} must be on or off`);
      return v;
    case "email":
      if (!z.string().email().safeParse(v).success) throw badRequest(`${field.label} must be a valid email`);
      return v.toLowerCase();
    case "url":
      if (!/^https?:\/\//i.test(v) || !z.string().url().safeParse(v).success) throw badRequest(`${field.label} must be a full link starting with https://`);
      return v;
    case "select":
      if (field.options && !field.options.includes(v)) throw badRequest(`Pick a valid option for ${field.label}`);
      return v;
    default:
      if (v.length > (field.type === "secret" || field.type === "textarea" ? 5000 : 300)) throw badRequest(`${field.label} is too long`);
      return field.type === "secret" ? value : v;
  }
  void key;
}

const saveSchema = z.object({ values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])) });

/** Saves several settings at once. For secrets, omit the key to keep the stored value and send "" or null to clear it. */
adminSettingsRouter.put("/settings", async (req, res) => {
  const { values } = parse(saveSchema, req.body);
  const writes: { key: string; value: string }[] = [];
  for (const [key, raw] of Object.entries(values)) {
    const field = SETTING_FIELDS.get(key);
    if (!field) throw badRequest(`Unknown setting ${key}`);
    writes.push({ key, value: check(field, key, raw === null ? "" : String(raw)) });
  }
  await prisma.$transaction(writes.map((w) => (w.value === "" ? prisma.setting.deleteMany({ where: { key: w.key } }) : prisma.setting.upsert({ where: { key: w.key }, create: w, update: { value: w.value } }))));
  // Log which keys changed, never the secret values.
  await logAdmin(currentUser(req).id, "settings.update", "setting", undefined, {
    changes: writes.map((w) => ({ key: w.key, value: SETTING_FIELDS.get(w.key)?.type === "secret" ? (w.value ? "updated" : "cleared") : w.value })),
  });
  res.json({ ok: true, saved: writes.length });
});
