"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.email().max(191) });

export async function subscribe(_prev, formData) {
  const parsed = schema.safeParse({
    email: String(formData.get("email") || "")
      .trim()
      .toLowerCase(),
  });
  if (!parsed.success) return { ok: false, message: "Please enter a valid email address." };

  const rl = await rateLimit("newsletter", LIMITS.newsletter);
  if (!rl.ok) return { ok: false, message: "Too many attempts. Please try again later." };

  await db.newsletterSubscriber.upsert({
    where: { email: parsed.data.email },
    update: { unsubscribedAt: null },
    create: { email: parsed.data.email },
  });
  // Same response whether or not the address already existed (no email enumeration).
  return { ok: true, message: "You're on the list. Watch your inbox for the next drop." };
}
