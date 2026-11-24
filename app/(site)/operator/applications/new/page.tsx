import { NewApplication } from "@/components/app/NewApplication";
import { Alert, LinkButton, PageHeader } from "@/components/ui";
import { requirePageActor } from "@/server/auth/actor";
import { prisma } from "@/server/db";
import { activeAuthorization } from "@/server/domain/access";

export const metadata = { title: "New assisted application" };

export default async function OperatorNewApplication({
  searchParams,
}: {
  searchParams: Promise<{ farmerId?: string; route?: string }>;
}) {
  const params = await searchParams;
  const actor = await requirePageActor(["OPERATOR"], "/operator");
  const farmerId = params.farmerId ?? "";
  const authorization = farmerId ? await activeAuthorization(prisma, actor.id, farmerId) : null;
  const farmer = authorization ? await prisma.user.findUnique({ where: { id: farmerId }, select: { displayName: true } }) : null;
  const route = params.route === "GOVERNMENT" || params.route === "BANK" ? params.route : null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New assisted application" />
      {!authorization || !farmer ? (
        <Alert tone="error" title="No active authorisation">
          You need a current one-time code from this farmer before you can start an application for them.
          <div className="mt-3">
            <LinkButton href="/operator" variant="secondary">
              Back to service centre
            </LinkButton>
          </div>
        </Alert>
      ) : (
        <NewApplication initialRoute={route} fromAssistant={false} farmerId={farmerId} farmerName={farmer.displayName} basePath="/operator/applications" />
      )}
    </div>
  );
}
