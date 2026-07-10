import type { Metadata } from "next";
import AdminCalendarClient from "./calendar-client";

export const metadata: Metadata = {
  title: "교회 일정 관리",
  robots: { index: false },
};

export default function AdminCalendarPage() {
  return <AdminCalendarClient />;
}
