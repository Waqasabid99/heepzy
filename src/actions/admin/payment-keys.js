"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireOwner } from "@/lib/session";
import { audit } from "@/lib/audit";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { SETTINGS_TAG } from "@/lib/settings";
import { hintOf, open, seal } from "@/lib/secret-box";
import { getSafepayKeys, SEAL, testSafepayKeys } from "@/lib/payments/safepay";

/**
 * Safepay keys entered in Admin → Settings → Payments. Owner only, and the
 * owner's password is asked again for every change: whoever controls these
 * keys controls where card payments go. Keys are tested with Safepay before
 * they're saved, stored encrypted, never sent back to the browser, and every
 * change is written to the audit log.
 */

const key = (min, label) =>
  z.union([
    z.literal(""),
    z
      .string()
      .min(min, `That doesn't look like a ${label}`)
      .max(200, `That doesn't look like a ${label}`)
      .regex(/^\S+$/, `${label[0].toUpperCase()}${label.slice(1)} can't contain spaces`),
  ]);

const schema = z.object({
  environment: z.enum(["sandbox", "production"], { error: "Choose sandbox or live" }),
  publicKey: key(8, "public key"),
  secretKey: key(16, "secret key"),
  webhookSecret: key(16, "webhook secret"),
  password: z.string().min(1, "Enter your password to confirm").max(128),
});

const fail = (errors, message) => ({ ok: false, errors, message });

function issues(error) {
  const errors = {};
  for (const i of error.issues) errors[i.path[0] ?? "form"] ??= i.message;
  return fail(errors);
}

/** Re-check the owner's password (they may have walked away from a signed-in laptop). */
async function passwordOk(userId, password) {
  const account = await db.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { password: true },
  });
  if (!account?.password) return false;
  const ctx = await auth.$context;
  return ctx.password.verify({ hash: account.password, password });
}

async function guard(owner, password) {
  const rl = await rateLimit("paymentKeys", { ...LIMITS.paymentKeys, key: owner.id });
  if (!rl.ok) return fail({}, "Too many attempts. Wait 15 minutes and try again.");
  if (password !== undefined && !(await passwordOk(owner.id, password))) {
    return fail({ password: "That password isn't right" });
  }
  return null;
}

const envManaged = async () => (await getSafepayKeys())?.source === "env";
const ENV_MESSAGE = "Payment keys can't be changed here.";

export async function saveSafepayKeys(_prev, fd) {
  const owner = await requireOwner();
  const parsed = schema.safeParse({
    environment: fd.get("environment") ?? undefined,
    publicKey: String(fd.get("publicKey") ?? "").trim(),
    secretKey: String(fd.get("secretKey") ?? "").trim(),
    webhookSecret: String(fd.get("webhookSecret") ?? "").trim(),
    password: String(fd.get("password") ?? ""),
  });
  if (!parsed.success) return issues(parsed.error);
  const f = parsed.data;

  const blocked = await guard(owner, f.password);
  if (blocked) return blocked;
  if (await envManaged()) return fail({}, ENV_MESSAGE);

  // Blank fields keep what's saved.
  const row = await db.paymentGateway.findUnique({ where: { provider: "SAFEPAY" } });
  const savedSecret = row ? open(row.secretKeyEnc, SEAL.secret) : null;
  const savedWebhook = row?.webhookSecretEnc ? open(row.webhookSecretEnc, SEAL.webhook) : null;
  const next = {
    environment: f.environment,
    publicKey: f.publicKey || row?.publicKey || "",
    secretKey: f.secretKey || savedSecret || "",
    webhookSecret: f.webhookSecret || savedWebhook || null,
  };
  const missing = {};
  if (!next.publicKey) missing.publicKey = "Enter the public key";
  if (!next.secretKey) missing.secretKey = "Enter the secret key";
  if (Object.keys(missing).length) return fail(missing);

  const changed = [
    f.environment !== row?.environment && "mode",
    f.publicKey && f.publicKey !== row?.publicKey && "public key",
    f.secretKey && f.secretKey !== savedSecret && "secret key",
    f.webhookSecret && f.webhookSecret !== savedWebhook && "webhook secret",
  ].filter(Boolean);
  if (row && !changed.length) return { ok: true, message: "Nothing to change." };

  const test = await testSafepayKeys(next);
  if (!test.ok) return fail({}, `${test.message} Nothing was saved.`);

  const data = {
    environment: next.environment,
    publicKey: next.publicKey,
    secretKeyEnc: seal(next.secretKey, SEAL.secret),
    secretHint: hintOf(next.secretKey),
    webhookSecretEnc: next.webhookSecret ? seal(next.webhookSecret, SEAL.webhook) : null,
    webhookHint: next.webhookSecret ? hintOf(next.webhookSecret) : null,
    updatedById: owner.id,
  };
  await db.paymentGateway.upsert({
    where: { provider: "SAFEPAY" },
    create: { provider: "SAFEPAY", ...data },
    update: data,
  });
  await audit({
    actorId: owner.id,
    action: row ? "settings.payment_keys.update" : "settings.payment_keys.add",
    entity: "PaymentGateway",
    entityId: "SAFEPAY",
    metadata: {
      changed,
      environment: next.environment,
      publicKeyEnds: hintOf(next.publicKey),
      secretKeyEnds: data.secretHint,
    },
  });
  updateTag(SETTINGS_TAG);
  refresh();
  return {
    ok: true,
    message: row
      ? `Safepay keys updated (${changed.join(", ")}) and tested.`
      : "Safepay keys saved and tested. You can now switch on card payments.",
  };
}

export async function removeSafepayKeys(_prev, fd) {
  const owner = await requireOwner();
  const password = String(fd.get("password") ?? "").slice(0, 128);
  if (!password) return fail({ password: "Enter your password to confirm" });
  const blocked = await guard(owner, password);
  if (blocked) return blocked;
  if (await envManaged()) return fail({}, ENV_MESSAGE);

  const res = await db.paymentGateway.deleteMany({ where: { provider: "SAFEPAY" } });
  if (!res.count) return { ok: true, message: "No keys were saved." };
  // Without keys card payments can't work, so switch them off.
  await db.storeSettings.updateMany({ where: { id: 1 }, data: { cardPaymentsEnabled: false } });
  await audit({
    actorId: owner.id,
    action: "settings.payment_keys.remove",
    entity: "PaymentGateway",
    entityId: "SAFEPAY",
  });
  updateTag(SETTINGS_TAG);
  refresh();
  return { ok: true, message: "Safepay keys removed and card payments switched off." };
}

/** Check the keys in use right now (environment or saved) against Safepay. */
export async function testSafepayConnection() {
  const owner = await requireOwner();
  const blocked = await guard(owner);
  if (blocked) return blocked;
  const keys = await getSafepayKeys();
  if (!keys) return fail({}, "No Safepay keys are set.");
  const test = await testSafepayKeys(keys);
  if (!test.ok) return test;
  return {
    ok: true,
    message: `Connected to Safepay (${keys.environment === "production" ? "live" : "sandbox"}).${keys.webhookSecret ? "" : " Add the webhook secret so payments are confirmed even if the customer closes the page."}`,
  };
}
