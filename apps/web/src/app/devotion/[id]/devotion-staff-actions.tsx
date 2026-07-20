"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { apiDeleteVoid, ApiError, apiErrorMessage } from "@/lib/api";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { getAdminPermissions } from "@/app/admin/permissions";

/** 큐티 상세의 스태프 전용 수정·삭제 바. 콘텐츠 관리 권한(canManageContent)이 없으면 렌더 안 함. */
export function DevotionStaffActions({ id }: { id: string }) {
  const router = useRouter();
  const { profile } = useCurrentUserProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!getAdminPermissions(profile?.role).canManageContent) return null;

  const onDelete = async () => {
    if (busy || !window.confirm("이 묵상을 삭제할까요? 달린 은혜나눔 댓글도 함께 삭제됩니다.")) return;
    setBusy(true);
    setError("");
    try {
      await apiDeleteVoid(`/api/admin/devotions/${id}`);
      router.push("/devotion");
      router.refresh();
    } catch (e) {
      setBusy(false);
      setError(e instanceof ApiError ? apiErrorMessage(e, "삭제하지 못했습니다.") : "삭제하지 못했습니다.");
    }
  };

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <Link
        href={`/devotion/${id}/edit`}
        className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium cta-outline"
      >
        <Pencil size={13} aria-hidden /> 수정
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium disabled:opacity-60"
        style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
      >
        <Trash2 size={13} aria-hidden /> 삭제
      </button>
      {error ? (
        <span role="alert" className="text-[12.5px]" style={{ color: "var(--danger)" }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
