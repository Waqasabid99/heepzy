import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { PaymentSettingsForm } from "@/components/admin/settings-forms";
import { SafepayKeysForm, SafepayRemoveForm, SafepayTestButton } from "@/components/admin/safepay-keys";
import { AlertCircle } from "@/components/ui/icons";
import { getSettingsForAdmin } from "@/lib/admin/settings";
import { getSafepayStatus } from "@/lib/payments/safepay";
import { isOwner } from "@/lib/roles";
import { pktDateTime } from "@/lib/pkt";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const metadata = { title: "Payment settings" };

export default withAdmin(async function PaymentSettingsPage({ admin }) {
  const [s, status] = await Promise.all([getSettingsForAdmin(), getSafepayStatus()]);
  const owner = isOwner(admin.role);
  const editor =
    status.source === "admin" && status.updatedById
      ? await db.user.findUnique({ where: { id: status.updatedById }, select: { name: true } })
      : null;
  const webhook = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/webhooks/safepay`;
  const ends = (h) => (h ? <span className="font-mono">…{h}</span> : <span className="text-fg-muted">Not set</span>);

  return (
    <AdminPage title="Settings" description="How the store looks and works for customers.">
      <SettingsTabs current="/admin/settings/payments" />
      <div className="grid max-w-4xl gap-5">
        <PaymentSettingsForm s={s} safepay={{ configured: status.configured, environment: status.environment }} />

        <section
          className="grid gap-5 rounded-2xl border border-line bg-surface p-5 text-sm sm:p-6"
          aria-labelledby="sp-h"
        >
          <div>
            <h2 id="sp-h" className="font-extrabold">
              Safepay connection
            </h2>
            <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[180px_1fr]">
              <dt className="text-fg-muted">Keys</dt>
              <dd className="font-semibold">{status.source ? "Connected" : "Not set"}</dd>
              {status.source ? (
                <>
                  <dt className="text-fg-muted">Mode</dt>
                  <dd className="font-semibold">
                    {status.environment === "production" ? "Live payments" : "Sandbox (test payments only)"}
                  </dd>
                  <dt className="text-fg-muted">Public key</dt>
                  <dd>{ends(status.publicKeyHint)}</dd>
                  <dt className="text-fg-muted">Secret key</dt>
                  <dd>{ends(status.secretHint)}</dd>
                  <dt className="text-fg-muted">Webhook secret</dt>
                  <dd>{ends(status.webhookHint)}</dd>
                </>
              ) : null}
              {status.updatedAt ? (
                <>
                  <dt className="text-fg-muted">Last changed</dt>
                  <dd>
                    {pktDateTime.format(new Date(status.updatedAt))}
                    {editor?.name ? ` by ${editor.name}` : ""}
                  </dd>
                </>
              ) : null}
              <dt className="text-fg-muted">Webhook address</dt>
              <dd className="font-mono text-xs break-all">{webhook}</dd>
            </dl>
            <p className="mt-3 text-[13px] text-fg-muted">
              Add the webhook address in your Safepay dashboard (Developers → Endpoints) so payments are confirmed even
              if the customer closes the page.
            </p>
          </div>

          {status.unreadable ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-bg p-4 font-semibold text-sale">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              The saved keys can no longer be used. Card payments are off until the keys are entered again.
            </p>
          ) : null}

          {!owner ? (
            <p className="text-[13px] text-fg-muted">Only the store owner can add or change payment keys.</p>
          ) : status.source === "env" ? (
            status.configured ? (
              <SafepayTestButton />
            ) : null
          ) : (
            <>
              {status.configured ? <SafepayTestButton /> : null}
              <div className="border-t border-line pt-5">
                <SafepayKeysForm status={status} />
              </div>
              {status.source === "admin" ? <SafepayRemoveForm /> : null}
            </>
          )}
        </section>
      </div>
    </AdminPage>
  );
});
