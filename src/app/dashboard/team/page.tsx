import type { Metadata } from "next";
import TeamManagementPage from "@/features/organizations/components/team-management-page";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return <TeamManagementPage />;
}
