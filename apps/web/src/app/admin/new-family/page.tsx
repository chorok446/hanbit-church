import type { Metadata } from "next";
import NewFamilyClient from "./new-family-client";

export const metadata: Metadata = {
  title: "새가족 관리",
  robots: { index: false },
};

export default function AdminNewFamilyPage() {
  return <NewFamilyClient />;
}
