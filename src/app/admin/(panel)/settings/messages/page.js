import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { MessageTemplateForm } from "@/components/admin/message-template-form";
import { getMessageTemplates } from "@/lib/admin/messages";
import { getSettingsForAdmin } from "@/lib/admin/settings";
import { MESSAGE_EVENTS, MESSAGE_GROUPS } from "@/lib/message-templates";

export const metadata = { title: "Message settings" };

export default withAdmin(async function MessageSettingsPage() {
  const [templates, s] = await Promise.all([getMessageTemplates(), getSettingsForAdmin()]);
  return (
    <AdminPage title="Settings" description="How the store looks and works for customers.">
      <SettingsTabs current="/admin/settings/messages" />
      <p className="mb-5 max-w-3xl text-sm text-fg-muted">
        WhatsApp messages made for customers when their order, return or refund moves on. They wait in Messages until
        someone sends them. Changes apply to new messages.
      </p>
      <div className="grid max-w-5xl gap-8">
        {Object.entries(MESSAGE_GROUPS).map(([group, title]) => (
          <section key={group} aria-labelledby={`grp-${group}`} className="grid gap-5">
            <h2 id={`grp-${group}`} className="font-display text-2xl font-semibold uppercase">
              {title}
            </h2>
            {templates
              .filter((t) => MESSAGE_EVENTS[t.event].group === group)
              .map((t) => (
                <MessageTemplateForm key={t.event} template={t} storeName={s.storeName} />
              ))}
          </section>
        ))}
      </div>
    </AdminPage>
  );
});
