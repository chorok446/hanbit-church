"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Library, Link2, Loader2, PlusCircle, Save, Search, Trash2, Upload, X } from "lucide-react";
import { StatePanel } from "@/components/ui/state-panel";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatDateLabel } from "@/data/calendar";
import {
  createPraiseSetlist,
  fetchPraiseSongLibrary,
  praisePartLabel,
  PRAISE_PARTS,
  PRAISE_SONG_TYPE_LABELS,
  SETLIST_STATUSES,
  SETLIST_STATUS_LABELS,
  updatePraiseSetlist,
  uploadPraiseFile,
  type PraiseNotice,
  type PraisePart,
  type PraiseSetlist,
  type PraiseSetlistSong,
  type PraiseSetlistStatus,
  type PraiseSongLibraryEntry,
  type PraiseSongType,
} from "@/data/praise-team";
import { usePraiseProfile } from "../praise-team-guard";
import { PraiseCard } from "../praise-ui";

/** 리더(찬양팀 LEADER 또는 사이트 ADMIN) 전용 화면 가드 — 서버도 같은 기준으로 재검사한다. */
export function LeaderOnly({ children }: { children: ReactNode }) {
  const profile = usePraiseProfile();
  const isLeader = profile.praiseRole === "LEADER" || profile.role === "ADMIN";
  if (!isLeader) {
    return (
      <StatePanel className="mx-auto max-w-xl">
        <p>콘티 작성·수정은 찬양팀 리더만 할 수 있습니다.</p>
        <Link
          href="/praise-team"
          className="rounded-full border px-4 py-2 text-[13px]"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          찬양팀 홈으로
        </Link>
      </StatePanel>
    );
  }
  return <>{children}</>;
}

// 폼 로컬 상태 — bpm 은 입력 중 빈 문자열을 허용해야 해서 문자열로 다루고 저장 시 파싱한다.
type SongDraft = {
  clientKey: string;
  id: string;
  title: string;
  key: string;
  bpm: string;
  type: PraiseSongType;
  links: { label: string; url: string }[];
  note: string;
  /** 파트별 메모 — Record 대신 배열로 편집하고 저장 시 다시 Record 로 만든다. */
  partNotes: { part: PraisePart; note: string }[];
};

type NoticeDraft = {
  clientKey: string;
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  author: string;
  date: string;
};

let draftSeq = 0;
const nextKey = () => `draft-${++draftSeq}`;

function toSongDraft(song: PraiseSetlistSong): SongDraft {
  return {
    clientKey: nextKey(),
    id: song.id,
    title: song.title,
    key: song.key,
    bpm: String(song.bpm || ""),
    type: song.type,
    links: song.links.map((link) => ({ ...link })),
    note: song.note ?? "",
    partNotes: (Object.entries(song.partNotes ?? {}) as [PraisePart, string][]).map(([part, note]) => ({
      part,
      note,
    })),
  };
}

function emptySongDraft(): SongDraft {
  return {
    clientKey: nextKey(),
    id: "",
    title: "",
    key: "",
    bpm: "",
    type: "praise",
    links: [],
    note: "",
    partNotes: [],
  };
}

/** 곡 라이브러리 항목 → 새 곡 초안(키·BPM·타입 채움, id 는 새로 채번되도록 비운다). */
function songDraftFromLibrary(entry: PraiseSongLibraryEntry): SongDraft {
  return {
    clientKey: nextKey(),
    id: "",
    title: entry.title,
    key: entry.key,
    bpm: String(entry.bpm || ""),
    type: entry.type,
    links: [],
    note: "",
    partNotes: [],
  };
}

function toNoticeDraft(notice: PraiseNotice): NoticeDraft {
  return {
    clientKey: nextKey(),
    id: notice.id,
    title: notice.title,
    body: notice.body,
    pinned: !!notice.pinned,
    author: notice.author,
    date: notice.date,
  };
}

const inputClass =
  "w-full rounded-2xl border px-4 py-3 text-[14px] outline-none placeholder:opacity-50";
const inputStyle = {
  background: "var(--panel)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
} as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium" style={{ color: "var(--foreground-muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

/** yyyy-MM-dd (로컬 기준 오늘) — 새 공지의 작성일. */
function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * 콘티 작성/수정 폼(리더 전용). 예배 정보 + 곡 목록(추가/삭제/순서/키/BPM/타입/메모/링크) + 공지.
 * 저장은 전체 교체(PUT) — 곡 순서는 배열 순서를 서버가 다시 채번한다.
 * prefill: 새 콘티 작성 시 "지난 콘티에서 복제"로 채워 넣을 곡·공지(예배 정보·날짜·배정은 제외).
 *          prefill 이 바뀌면 상위(new 페이지)에서 key 를 바꿔 폼을 재마운트한다.
 */
export function SetlistForm({
  initial,
  prefill,
}: {
  initial?: PraiseSetlist;
  prefill?: { songs: PraiseSetlistSong[]; notices: PraiseNotice[] };
}) {
  const profile = usePraiseProfile();
  const router = useRouter();

  const initialSongs: SongDraft[] = initial
    ? initial.songs.map(toSongDraft)
    : prefill && prefill.songs.length > 0
      ? prefill.songs.map(toSongDraft)
      : [emptySongDraft()];
  const initialNotices: NoticeDraft[] = initial
    ? initial.notices.map(toNoticeDraft)
    : (prefill?.notices ?? []).map(toNoticeDraft);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [worshipDate, setWorshipDate] = useState(initial?.worshipDate ?? "");
  const [worshipType, setWorshipType] = useState(initial?.worshipType ?? "주일 2부 예배");
  const [serviceTime, setServiceTime] = useState(initial?.serviceTime ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [rehearsalTime, setRehearsalTime] = useState(initial?.rehearsalTime ?? "");
  const [status, setStatus] = useState<PraiseSetlistStatus>(initial?.status ?? "DRAFT");
  const [songs, setSongs] = useState<SongDraft[]>(initialSongs);
  const [notices, setNotices] = useState<NoticeDraft[]>(initialNotices);
  const [saving, setSaving] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const patchSong = (clientKey: string, patch: Partial<SongDraft>) => {
    setSongs((prev) => prev.map((song) => (song.clientKey === clientKey ? { ...song, ...patch } : song)));
  };

  // 파일 업로드(악보 사진·PDF) — 숨은 input 하나를 공유하고 대상 곡 key 를 기억한다.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetKeyRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = (clientKey: string) => {
    if (uploading) return;
    uploadTargetKeyRef.current = clientKey;
    fileInputRef.current?.click();
  };

  const onFileSelected = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = "";
    const targetKey = uploadTargetKeyRef.current;
    if (!file || !targetKey) return;
    setUploading(true);
    try {
      const uploaded = await uploadPraiseFile(file);
      // 업로드 결과를 해당 곡의 자료 링크로 자동 추가한다(라벨 = 종류 + 파일명).
      setSongs((prev) =>
        prev.map((song) =>
          song.clientKey === targetKey
            ? {
                ...song,
                links: [
                  ...song.links,
                  {
                    label: `${uploaded.kind === "pdf" ? "악보 PDF" : "악보 사진"} · ${uploaded.name}`,
                    url: uploaded.url,
                  },
                ],
              }
            : song,
        ),
      );
      toast.success("파일을 업로드해 자료 링크에 추가했습니다.");
    } catch (e) {
      toast.error(
        e instanceof ApiError
          ? apiErrorMessage(e, "파일 업로드에 실패했습니다. 이미지(5MB)·PDF(10MB)만 올릴 수 있어요.")
          : "파일 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setUploading(false);
      uploadTargetKeyRef.current = null;
    }
  };

  const moveSong = (index: number, delta: -1 | 1) => {
    setSongs((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    if (saving) return;
    if (!title.trim()) {
      toast.error("콘티 제목을 입력해 주세요.");
      return;
    }
    if (!worshipDate) {
      toast.error("예배 날짜를 선택해 주세요.");
      return;
    }
    if (!worshipType.trim()) {
      toast.error("예배 구분을 입력해 주세요.");
      return;
    }
    const validSongs = songs.filter((song) => song.title.trim());
    if (songs.some((song) => !song.title.trim() && (song.key.trim() || song.bpm.trim() || song.note.trim()))) {
      toast.error("곡명이 비어있는 곡이 있습니다. 곡명을 입력하거나 곡을 삭제해 주세요.");
      return;
    }
    const body = {
      title: title.trim(),
      worshipDate,
      worshipType: worshipType.trim(),
      serviceTime: serviceTime.trim() || undefined,
      location: location.trim() || undefined,
      rehearsalTime: rehearsalTime.trim() || undefined,
      status,
      songs: validSongs.map((song, index) => {
        const partNoteEntries = song.partNotes.filter((entry) => entry.note.trim());
        return {
          id: song.id,
          order: index + 1,
          title: song.title.trim(),
          key: song.key.trim(),
          bpm: Number.parseInt(song.bpm, 10) || 0,
          type: song.type,
          links: song.links.filter((link) => link.url.trim()).map((link) => ({
            label: link.label.trim() || "링크",
            url: link.url.trim(),
          })),
          note: song.note.trim() || undefined,
          partNotes:
            partNoteEntries.length > 0
              ? Object.fromEntries(partNoteEntries.map((entry) => [entry.part, entry.note.trim()]))
              : undefined,
        };
      }),
      notices: notices
        .filter((notice) => notice.title.trim())
        .map((notice) => ({
          id: notice.id,
          title: notice.title.trim(),
          body: notice.body.trim(),
          author: notice.author || profile.name,
          date: notice.date || todayKey(),
          pinned: notice.pinned,
        })),
    };
    setSaving(true);
    try {
      const saved = initial
        ? await updatePraiseSetlist(initial.id, body)
        : await createPraiseSetlist(body);
      toast.success(initial ? "콘티를 수정했습니다." : "콘티를 등록했습니다.");
      router.push(`/praise-team/setlists/${saved.id}`);
    } catch (e) {
      toast.error(
        e instanceof ApiError
          ? apiErrorMessage(e, "콘티 저장에 실패했습니다. 입력 값을 확인해 주세요.")
          : "콘티 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 예배 정보 */}
      <PraiseCard label="Worship" title="예배 정보">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="콘티 제목 *">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="예: 7월 둘째 주 콘티"
                className={inputClass}
                style={inputStyle}
              />
            </Field>
          </div>
          <Field label="예배 날짜 *">
            <input
              type="date"
              value={worshipDate}
              onChange={(e) => setWorshipDate(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label="예배 구분 *">
            <input
              value={worshipType}
              onChange={(e) => setWorshipType(e.target.value)}
              maxLength={50}
              placeholder="예: 주일 2부 예배"
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label="예배 시간">
            <input
              value={serviceTime}
              onChange={(e) => setServiceTime(e.target.value)}
              maxLength={50}
              placeholder="예: 오전 11:00"
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label="장소">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
              placeholder="예: 본당"
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label="리허설 안내">
            <input
              value={rehearsalTime}
              onChange={(e) => setRehearsalTime(e.target.value)}
              maxLength={100}
              placeholder="예: 주일 오전 8:30 본당"
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label="상태">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PraiseSetlistStatus)}
              className={inputClass}
              style={inputStyle}
            >
              {SETLIST_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {SETLIST_STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </PraiseCard>

      {/* 곡 목록 */}
      <PraiseCard
        label="Songs"
        title="곡 목록"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px]"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <Library size={14} aria-hidden style={{ color: "var(--accent-strong)" }} />곡 불러오기
            </button>
            <button
              type="button"
              onClick={() => setSongs((prev) => [...prev, emptySongDraft()])}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px]"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <PlusCircle size={14} aria-hidden style={{ color: "var(--accent-strong)" }} />곡 추가
            </button>
          </div>
        }
      >
        {songs.length === 0 ? (
          <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
            아직 곡이 없습니다. “곡 추가”로 시작해 주세요.
          </p>
        ) : (
          <ol className="space-y-4">
            {songs.map((song, index) => (
              <li
                key={song.clientKey}
                className="rounded-2xl border p-4"
                style={{ background: "var(--panel)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums"
                    style={{ background: "var(--chip-bg)", color: "var(--heading)" }}
                  >
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveSong(index, -1)}
                      disabled={index === 0}
                      aria-label={`${index + 1}번 곡 위로`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border disabled:opacity-30"
                      style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    >
                      <ArrowUp size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSong(index, 1)}
                      disabled={index === songs.length - 1}
                      aria-label={`${index + 1}번 곡 아래로`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border disabled:opacity-30"
                      style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    >
                      <ArrowDown size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSongs((prev) => prev.filter((s) => s.clientKey !== song.clientKey))
                      }
                      aria-label={`${index + 1}번 곡 삭제`}
                      className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full border"
                      style={{ borderColor: "var(--border)", color: "var(--danger)" }}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="곡명 *">
                      <input
                        value={song.title}
                        onChange={(e) => patchSong(song.clientKey, { title: e.target.value })}
                        maxLength={100}
                        placeholder="예: 주님 말씀하시면"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                    <Field label="키">
                      <input
                        value={song.key}
                        onChange={(e) => patchSong(song.clientKey, { key: e.target.value })}
                        maxLength={10}
                        placeholder="G"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="BPM">
                      <input
                        value={song.bpm}
                        onChange={(e) =>
                          patchSong(song.clientKey, { bpm: e.target.value.replace(/[^0-9]/g, "") })
                        }
                        inputMode="numeric"
                        maxLength={3}
                        placeholder="72"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="타입">
                      <select
                        value={song.type}
                        onChange={(e) =>
                          patchSong(song.clientKey, { type: e.target.value as PraiseSongType })
                        }
                        className={inputClass}
                        style={inputStyle}
                      >
                        {(Object.keys(PRAISE_SONG_TYPE_LABELS) as PraiseSongType[]).map((type) => (
                          <option key={type} value={type}>
                            {PRAISE_SONG_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="곡 메모">
                      <textarea
                        value={song.note}
                        onChange={(e) => patchSong(song.clientKey, { note: e.target.value })}
                        rows={2}
                        maxLength={500}
                        placeholder="구성·전조 등 (가사 전문은 저작권 문제로 싣지 않아요)"
                        className={`${inputClass} resize-none`}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                </div>
                {/* 링크 */}
                <div className="mt-3 space-y-2">
                  {song.links.map((link, linkIndex) => (
                    <div key={linkIndex} className="flex flex-wrap items-center gap-2">
                      <Link2 size={14} aria-hidden className="shrink-0" style={{ color: "var(--accent-strong)" }} />
                      <input
                        value={link.label}
                        onChange={(e) =>
                          patchSong(song.clientKey, {
                            links: song.links.map((l, i) =>
                              i === linkIndex ? { ...l, label: e.target.value } : l,
                            ),
                          })
                        }
                        maxLength={30}
                        placeholder="라벨 (예: 데모 영상)"
                        aria-label={`${index + 1}번 곡 링크 ${linkIndex + 1} 라벨`}
                        className="w-40 rounded-xl border px-3 py-2 text-[13px] outline-none placeholder:opacity-50"
                        style={inputStyle}
                      />
                      <input
                        value={link.url}
                        onChange={(e) =>
                          patchSong(song.clientKey, {
                            links: song.links.map((l, i) =>
                              i === linkIndex ? { ...l, url: e.target.value } : l,
                            ),
                          })
                        }
                        maxLength={500}
                        placeholder="https://…"
                        aria-label={`${index + 1}번 곡 링크 ${linkIndex + 1} 주소`}
                        className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-[13px] outline-none placeholder:opacity-50"
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          patchSong(song.clientKey, {
                            links: song.links.filter((_, i) => i !== linkIndex),
                          })
                        }
                        aria-label={`${index + 1}번 곡 링크 ${linkIndex + 1} 삭제`}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
                        style={{ borderColor: "var(--border)", color: "var(--danger)" }}
                      >
                        <Trash2 size={13} aria-hidden />
                      </button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        patchSong(song.clientKey, { links: [...song.links, { label: "", url: "" }] })
                      }
                      className="inline-flex min-h-11 items-center gap-1.5 text-[13px] underline underline-offset-2"
                      style={{ color: "var(--foreground-muted)" }}
                    >
                      <Link2 size={13} aria-hidden />
                      링크 추가 (악보·데모 영상 등)
                    </button>
                    <button
                      type="button"
                      onClick={() => pickFile(song.clientKey)}
                      disabled={uploading}
                      className="inline-flex min-h-11 items-center gap-1.5 text-[13px] underline underline-offset-2 disabled:opacity-50"
                      style={{ color: "var(--foreground-muted)" }}
                    >
                      <Upload size={13} aria-hidden />
                      {uploading ? "업로드 중…" : "파일 업로드 (악보 사진·PDF)"}
                    </button>
                  </div>
                </div>
                {/* 파트별 메모 */}
                <div className="mt-3 space-y-2">
                  {song.partNotes.map((entry, entryIndex) => (
                    <div key={entryIndex} className="flex flex-wrap items-center gap-2">
                      <select
                        value={entry.part}
                        onChange={(e) =>
                          patchSong(song.clientKey, {
                            partNotes: song.partNotes.map((p, i) =>
                              i === entryIndex ? { ...p, part: e.target.value as PraisePart } : p,
                            ),
                          })
                        }
                        aria-label={`${index + 1}번 곡 파트 메모 ${entryIndex + 1} 파트`}
                        className="w-36 rounded-xl border px-3 py-2 text-[13px] outline-none"
                        style={inputStyle}
                      >
                        {PRAISE_PARTS.map((part) => (
                          <option key={part} value={part}>
                            {praisePartLabel(part)}
                          </option>
                        ))}
                      </select>
                      <input
                        value={entry.note}
                        onChange={(e) =>
                          patchSong(song.clientKey, {
                            partNotes: song.partNotes.map((p, i) =>
                              i === entryIndex ? { ...p, note: e.target.value } : p,
                            ),
                          })
                        }
                        maxLength={200}
                        placeholder="파트 메모 (예: 인트로 8마디 패드 단독)"
                        aria-label={`${index + 1}번 곡 파트 메모 ${entryIndex + 1} 내용`}
                        className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-[13px] outline-none placeholder:opacity-50"
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          patchSong(song.clientKey, {
                            partNotes: song.partNotes.filter((_, i) => i !== entryIndex),
                          })
                        }
                        aria-label={`${index + 1}번 곡 파트 메모 ${entryIndex + 1} 삭제`}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
                        style={{ borderColor: "var(--border)", color: "var(--danger)" }}
                      >
                        <Trash2 size={13} aria-hidden />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      patchSong(song.clientKey, {
                        partNotes: [...song.partNotes, { part: PRAISE_PARTS[1], note: "" }],
                      })
                    }
                    className="inline-flex min-h-11 items-center gap-1.5 text-[13px] underline underline-offset-2"
                    style={{ color: "var(--foreground-muted)" }}
                  >
                    <PlusCircle size={13} aria-hidden />
                    파트 메모 추가
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </PraiseCard>

      {/* 공유 파일 선택 input — pickFile() 이 대상 곡을 기억한 뒤 연다. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void onFileSelected(e.currentTarget)}
      />

      {libraryOpen ? (
        <SongLibraryPicker
          onClose={() => setLibraryOpen(false)}
          onPick={(entry) => {
            setSongs((prev) => {
              // 첫 곡이 비어 있으면(예: 새 폼의 기본 빈 곡) 그 자리를 채우고, 아니면 뒤에 추가한다.
              const draft = songDraftFromLibrary(entry);
              if (prev.length === 1 && !prev[0].title.trim()) return [draft];
              return [...prev, draft];
            });
            setLibraryOpen(false);
            toast.success(`"${entry.title}"을(를) 곡 목록에 추가했습니다.`);
          }}
        />
      ) : null}

      {/* 공지 */}
      <PraiseCard
        label="Notice"
        title="공지"
        action={
          <button
            type="button"
            onClick={() =>
              setNotices((prev) => [
                ...prev,
                {
                  clientKey: nextKey(),
                  id: "",
                  title: "",
                  body: "",
                  pinned: false,
                  author: profile.name,
                  date: todayKey(),
                },
              ])
            }
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <PlusCircle size={14} aria-hidden style={{ color: "var(--accent-strong)" }} />공지 추가
          </button>
        }
      >
        {notices.length === 0 ? (
          <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
            콘티와 함께 전달할 공지가 있으면 추가해 주세요. (예: 리허설 시간 변경)
          </p>
        ) : (
          <ul className="space-y-4">
            {notices.map((notice, index) => (
              <li
                key={notice.clientKey}
                className="rounded-2xl border p-4"
                style={{ background: "var(--panel)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <label
                    className="inline-flex items-center gap-1.5 text-[13px]"
                    style={{ color: "var(--foreground-muted)" }}
                  >
                    <input
                      type="checkbox"
                      checked={notice.pinned}
                      onChange={(e) =>
                        setNotices((prev) =>
                          prev.map((n) =>
                            n.clientKey === notice.clientKey ? { ...n, pinned: e.target.checked } : n,
                          ),
                        )
                      }
                    />
                    상단 고정
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNotices((prev) => prev.filter((n) => n.clientKey !== notice.clientKey))
                    }
                    aria-label={`${index + 1}번 공지 삭제`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border"
                    style={{ borderColor: "var(--border)", color: "var(--danger)" }}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  <Field label="공지 제목 *">
                    <input
                      value={notice.title}
                      onChange={(e) =>
                        setNotices((prev) =>
                          prev.map((n) =>
                            n.clientKey === notice.clientKey ? { ...n, title: e.target.value } : n,
                          ),
                        )
                      }
                      maxLength={100}
                      placeholder="예: 리허설 시간 변경"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="내용">
                    <textarea
                      value={notice.body}
                      onChange={(e) =>
                        setNotices((prev) =>
                          prev.map((n) =>
                            n.clientKey === notice.clientKey ? { ...n, body: e.target.value } : n,
                          ),
                        )
                      }
                      rows={3}
                      maxLength={1000}
                      className={`${inputClass} resize-none`}
                      style={inputStyle}
                    />
                  </Field>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PraiseCard>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="cta-solid inline-flex min-h-12 items-center gap-1.5 rounded-full px-7 text-[14px] font-medium disabled:opacity-60"
        >
          <Save size={15} aria-hidden />
          {saving ? "저장 중…" : initial ? "콘티 수정 저장" : "콘티 등록"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex min-h-12 items-center rounded-full border px-6 text-[14px]"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

/**
 * 곡 라이브러리 선택 모달 — 과거 콘티 곡을 곡명 검색해 폼에 추가한다.
 * 검색은 서버(/api/praise/songs?q=)에서 집계·필터한다.
 */
function SongLibraryPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (entry: PraiseSongLibraryEntry) => void;
}) {
  const [query, setQuery] = useState("");
  // result.key === query 가 아니면 로딩 중으로 취급(effect 안 동기 setState 없이 로딩 표현).
  const [result, setResult] = useState<{ key: string; entries: PraiseSongLibraryEntry[]; error: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // 입력 디바운스(300ms) — 타이핑마다 요청하지 않는다.
    const timer = setTimeout(() => {
      fetchPraiseSongLibrary(query)
        .then((list) => {
          if (!cancelled) setResult({ key: query, entries: list, error: false });
        })
        .catch(() => {
          if (!cancelled) setResult({ key: query, entries: [], error: true });
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const loading = result === null || result.key !== query;
  const entries = loading ? null : result.entries;
  const error = loading ? false : result.error;

  return (
    <div
      className="overlay-fade fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: "rgba(var(--ink-rgb), 0.4)" }}
      role="dialog"
      aria-modal="true"
      aria-label="곡 라이브러리"
      onClick={onClose}
    >
      <div
        className="dialog-panel-pop max-h-[80vh] w-full max-w-lg overflow-hidden rounded-3xl border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b p-5" style={{ borderColor: "var(--border)" }}>
          <h3
            className="text-[18px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            곡 라이브러리
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
        <div className="p-5">
          <div className="relative">
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: "var(--foreground-muted)" }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="곡명 검색 (예: 은혜)"
              className="w-full rounded-2xl border py-3 pl-10 pr-4 text-[14px] outline-none placeholder:opacity-50"
              style={inputStyle}
            />
          </div>
        </div>
        <div className="max-h-[50vh] overflow-y-auto px-5 pb-5">
          {entries === null ? (
            <p className="flex items-center gap-2 py-6 text-[14px]" style={{ color: "var(--foreground-muted)" }}>
              <Loader2 className="animate-spin" size={16} aria-hidden />
              불러오는 중…
            </p>
          ) : entries.length === 0 ? (
            <p className="py-6 text-[14px]" style={{ color: "var(--foreground-muted)" }}>
              {error
                ? "곡 라이브러리를 불러오지 못했습니다."
                : query.trim()
                  ? "검색 결과가 없습니다."
                  : "아직 등록된 곡이 없습니다. 콘티에 곡을 추가하면 여기에 쌓입니다."}
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li key={entry.title}>
                  <button
                    type="button"
                    onClick={() => onPick(entry)}
                    className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left"
                    style={{ background: "var(--panel)", borderColor: "var(--border)" }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium" style={{ color: "var(--heading)" }}>
                        {entry.title}
                      </span>
                      <span className="mt-0.5 block text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                        {entry.key || "키 미정"} · {entry.bpm}BPM · {PRAISE_SONG_TYPE_LABELS[entry.type]} · {entry.useCount}회 사용 · 최근{" "}
                        {formatDateLabel(entry.lastUsedDate)}
                      </span>
                    </span>
                    <PlusCircle size={16} aria-hidden style={{ color: "var(--accent-strong)" }} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
