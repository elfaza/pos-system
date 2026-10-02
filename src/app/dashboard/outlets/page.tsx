import type { Metadata } from "next";
import OutletManagementPage from "@/features/organizations/components/outlet-management-page";

export const metadata: Metadata = { title: "Outlets" };

export default function OutletsPage() {
  return <OutletManagementPage />;
}
