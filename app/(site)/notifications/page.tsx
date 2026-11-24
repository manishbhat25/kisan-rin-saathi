import { NotificationList } from "@/components/app/NotificationList";
import { PageHeader } from "@/components/ui";
import { getDict } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";
import { listNotifications } from "@/server/domain/queries";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const actor = await requirePageActor(["FARMER", "GOV_OFFICER", "BANK_OFFICER", "OPERATOR"], "/notifications");
  const [data, { t }] = await Promise.all([listNotifications(actor), getDict()]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.notifications} />
      <NotificationList items={data.items} />
    </div>
  );
}
