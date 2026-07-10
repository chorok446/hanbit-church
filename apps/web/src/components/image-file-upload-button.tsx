"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { uploadMedia, uploadMediaErrorMessage } from "@/lib/upload-media";

const ACCEPT = "image/jpeg,image/png,image/webp";

export function ImageFileUploadButton({
  onUploaded,
  onUploadedMany,
  maxFiles = 1,
  disabled,
  label = "파일 업로드",
  className,
}: {
  /** 단일 업로드 콜백. maxFiles 1(기본)일 때 사용한다. */
  onUploaded?: (url: string) => void;
  /**
   * 다중 업로드 배치 콜백 — 성공한 URL 을 한 번에 전달한다. 파일마다 onUploaded 를
   * 반복 호출하면 부모가 렌더 시점 상태를 캡처한 스테일 클로저로 앞선 URL 을 잃는다.
   */
  onUploadedMany?: (urls: string[]) => void;
  /** 한 번에 선택·업로드할 수 있는 최대 파일 수. 2 이상이면 다중 선택이 열린다. */
  maxFiles?: number;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (picked.length === 0) return;

    const files = picked.slice(0, Math.max(1, maxFiles));
    const skipped = picked.length - files.length;

    setUploading(true);
    setError("");
    const urls: string[] = [];
    const failures: string[] = [];
    for (const [index, file] of files.entries()) {
      if (files.length > 1) setProgress({ done: index, total: files.length });
      try {
        urls.push(await uploadMedia(file));
      } catch (pickError) {
        const message = uploadMediaErrorMessage(pickError, "이미지 업로드에 실패했습니다.");
        failures.push(files.length > 1 ? `${file.name}: ${message}` : message);
      }
    }

    if (urls.length > 0) {
      if (onUploadedMany) onUploadedMany(urls);
      else for (const url of urls) onUploaded?.(url);
    }

    const messages = [...failures];
    if (skipped > 0) messages.push(`한 번에 ${files.length}개까지만 업로드할 수 있어 ${skipped}개는 제외했습니다.`);
    setError(messages.join(" "));
    setUploading(false);
    setProgress(null);
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple={maxFiles > 1}
        className="sr-only"
        onChange={(event) => void onPick(event)}
        disabled={disabled || uploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-medium disabled:opacity-40"
        style={{ background: "var(--border)", color: "var(--foreground)" }}
      >
        {uploading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ImageIcon size={14} aria-hidden />}
        {uploading ? (progress ? `업로드 중… (${progress.done + 1}/${progress.total})` : "업로드 중…") : label}
      </button>
      {error ? <p className="mt-1.5 text-[12px]" style={{ color: "var(--danger)" }} role="alert">{error}</p> : null}
    </div>
  );
}
