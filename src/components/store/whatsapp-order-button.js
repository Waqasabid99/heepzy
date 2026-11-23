"use client";

import { useEffect } from "react";
import { WhatsApp } from "@/components/ui/icons";

/**
 * "Send order on WhatsApp". Right after checkout (`autoOpen`) it opens WhatsApp once
 * by itself, so the customer only has to press send; the button stays for a retry.
 */
export function WhatsAppOrderButton({ href, orderNumber, autoOpen = false }) {
  useEffect(() => {
    if (!autoOpen) return;
    const key = `hz-wa-sent-${orderNumber}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage blocked: still open once
    }
    window.location.assign(href);
  }, [autoOpen, href, orderNumber]);

  return (
    <a href={href} className="btn min-h-14 bg-whatsapp-deep px-7 text-base text-white hover:opacity-90">
      <WhatsApp className="size-5" /> Send order on WhatsApp
    </a>
  );
}
