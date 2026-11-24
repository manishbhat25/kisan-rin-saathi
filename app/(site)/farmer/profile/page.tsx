import { AssistanceAccess, ProfileForm } from "@/components/app/ProfileForms";
import { PageHeader } from "@/components/ui";
import { getDict } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";
import { farmerAuthorizations, getProfile } from "@/server/domain/accounts";

export const metadata = { title: "Profile" };

const str = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));

export default async function FarmerProfilePage() {
  const actor = await requirePageActor(["FARMER"], "/farmer/profile");
  const [profile, authorizations, { t }] = await Promise.all([getProfile(actor), farmerAuthorizations(actor), getDict()]);
  const p = profile.farmerProfile;
  return (
    <div>
      <PageHeader title={t.navProfile} subtitle={`Signed in as ${profile.email}. These details fill in new applications automatically.`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <ProfileForm
          initial={{
            fullName: p?.fullName ?? profile.displayName,
            phone: str(profile.phone),
            age: str(p?.age),
            stateCode: str(p?.stateCode),
            district: str(p?.district),
            village: str(p?.village),
            farmerCategory: str(p?.farmerCategory),
            landholdingAcres: str(p?.landholdingAcres),
            primaryCrop: str(p?.primaryCrop),
          }}
        />
        <AssistanceAccess authorizations={authorizations} />
      </div>
    </div>
  );
}
