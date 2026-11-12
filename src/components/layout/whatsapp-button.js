import { getStoreSettings } from "@/lib/settings";
import { WhatsApp } from "@/components/ui/icons";

/**
 * Floating "chat on WhatsApp" button. Only shown when a WhatsApp number is
 * set in Store settings (international format, e.g. 923001234567).
 */
export async function WhatsAppButton() {
  const { whatsappNumber } = await getStoreSettings();
  const digits = whatsappNumber?.replace(/\D/g, "");
  if (!digits || digits.length < 10) return null;
  const text = encodeURIComponent("Hi Heepzy, I need help with my order.");

  return (
    <a
      href={`https://wa.me/${digits}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp (opens in a new tab)"
      className="fixed right-4 bottom-4 z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-white shadow-[0_10px_30px_rgb(0_0_0/0.25)] transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
    >
      <WhatsApp className="size-7" />
    </a>
  );
}
