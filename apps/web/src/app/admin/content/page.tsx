import type { Metadata } from "next";
import AdminContentClient from "./content-client";

export const metadata: Metadata = {
  title: "콘텐츠 관리",
  robots: { index: false },
};

export default function AdminContentPage() {
  return <AdminContentClient />;
}
