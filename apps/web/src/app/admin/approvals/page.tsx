import type { Metadata } from "next";
import ApprovalsClient from "./approvals-client";

export const metadata: Metadata = {
  title: "가입 승인",
  robots: { index: false },
};

export default function AdminApprovalsPage() {
  return <ApprovalsClient />;
}
