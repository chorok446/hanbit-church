"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Copy } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { formatDateLabel } from "@/data/calendar";
import {
  fetchPraiseSetlist,
  fetchPraiseSetlists,
  type PraiseNotice,
  type PraiseSetlistSong,
  type PraiseSetlistSummary,
} from "@/data/praise-team";
import { SectionLabel } from "../../praise-ui";
import { LeaderOnly, SetlistForm } from "../setlist-form";

/** 새 콘티 작성(리더 전용). 배정은 콘티 저장 후 상세 → 배정 관리에서 한다. */
export function NewSetlistClient() {
  const [options, setOptions] = useState<PraiseSetlistSummary[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [loadingSource, setLoadingSource] = useState(false);
  // 복제로 채운 곡·공지. formKey 를 바꿔 SetlistForm 을 재마운트해 초기값을 다시 잡는다.
  const [prefill, setPrefill] = useState<{ songs: PraiseSetlistSong[]; notices: PraiseNotice[] } | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPraiseSetlists()
      .then((list) => {
        if (!cancelled) setOptions(list);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadFromSource = async (id: string) => {
    setSourceId(id);
    if (!id) {
      setPrefill(null);
      setFormKey((k) => k + 1);
      return;
    }
    setLoadingSource(true);
    try {
      const source = await fetchPraiseSetlist(id);
      if (!source) {
        toast.error("선택한 콘티를 불러오지 못했습니다.");
        return;
      }
      // 곡·공지만 복제한다(예배 정보·날짜·배정·참석은 제외). 곡·공지 id 는 비워 새로 채번되게 한다.
      setPrefill({
        songs: source.songs.map((song) => ({ ...song, id: "" })),
        notices: source.notices.map((notice) => ({ ...notice, id: "" })),
      });
      setFormKey((k) => k + 1);
      toast.success(`"${source.title}"의 곡·공지를 불러왔습니다. 예배 날짜를 새로 입력해 주세요.`);
    } catch {
      toast.error("콘티를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoadingSource(false);
    }
  };

  return (
    <PageShell orb="right" paddingClassName="px-6 pb-24 pt-32">
      <div className="mx-auto max-w-4xl">
        <LeaderOnly>
          <Link
            href="/praise-team/setlists"
            className="inline-flex min-h-11 items-center gap-1.5 text-[13px]"
            style={{ color: "var(--foreground-muted)" }}
          >
            <ArrowLeft size={14} aria-hidden />
            콘티 목록
          </Link>
          <header className="mt-4">
            <SectionLabel>New Setlist</SectionLabel>
            <h1
              className="mt-2 text-[28px] sm:text-[32px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
            >
              새 콘티 작성
            </h1>
            <p className="mt-2 text-[14px] leading-7" style={{ color: "var(--foreground-muted)" }}>
              파트 배정은 콘티를 저장한 뒤 상세 화면의 “배정 관리”에서 할 수 있어요.
            </p>
          </header>

          {/* 지난 콘티에서 복제 */}
          {options.length > 0 ? (
            <section
              className="mt-6 rounded-3xl border p-5"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <label
                className="flex items-center gap-1.5 text-[12px] font-medium"
                style={{ color: "var(--foreground-muted)" }}
              >
                <Copy size={13} aria-hidden style={{ color: "var(--accent-strong)" }} />
                지난 콘티에서 복제 (곡·공지만 가져옵니다)
              </label>
              <select
                value={sourceId}
                onChange={(e) => void loadFromSource(e.target.value)}
                disabled={loadingSource}
                aria-label="지난 콘티에서 복제"
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-[14px] outline-none disabled:opacity-60"
                style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <option value="">복제 안 함 (빈 폼)</option>
                {options.map((setlist) => (
                  <option key={setlist.id} value={setlist.id}>
                    {formatDateLabel(setlist.worshipDate)} {setlist.worshipType} · {setlist.title} (곡 {setlist.songCount}개)
                  </option>
                ))}
              </select>
            </section>
          ) : null}

          <div className="mt-6">
            <SetlistForm key={formKey} prefill={prefill ?? undefined} />
          </div>
        </LeaderOnly>
      </div>
    </PageShell>
  );
}
