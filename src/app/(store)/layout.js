import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";

/** Shared storefront chrome. Each route group's layout adds the matching header variant. */
export default function StoreLayout({ children }) {
  return (
    <div className="relative flex flex-1 flex-col">
      <AnnouncementBar />
      {children}
      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}
