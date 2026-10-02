import type { Metadata } from "next";
import OrganizationProfilePage from "@/features/organizations/components/organization-profile-page";

export const metadata: Metadata = { title: "Organization" };

export default function OrganizationPage() {
  return <OrganizationProfilePage />;
}
