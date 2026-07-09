"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, X } from "lucide-react";
import { POST_MAX_ATTACHMENTS, type PostAttachment } from "@/data/posts";
import { uploadDocument, uploadDocumentErrorMessage } from "@/lib/upload-document";

function formatBytes(size?: number | null): string | null {
  if (!size || size <= 0) return null;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

/** 공지·주보 전용 PDF 첨부 편집기(관리자). 업로드 후 목록에 추가되고 X 로 제거한다. */
export function PostAttachmentsEditor({
  attachments,
  onChange,
  disabled,
}: {
  attachments: PostAttachment[];
  onChange: (next: PostAttachment[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => inputRef.current?.click();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (attachments.length >= POST_MAX_ATTACHMENTS) {
      toast.error(`첨부는 최대 ${POST_MAX_ATTACHMENTS}개까지 가능합니다.`);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadDocument(file);
      onChange([...attachments.filter((item) => item.url !== url), { name: file.name, url, size: file.size }]);
      toast.success("문서를 첨부했어요.");
    } catch (error) {
      toast.error(uploadDocumentErrorMessage(error, "문서 업로드에 실패했습니다."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <p className="mb-2 text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
        파일 첨부 <span className="normal-case tracking-normal opacity-70">(파일당 10MB · 최대 {POST_MAX_ATTACHMENTS}개)</span>
      </p>
      {attachments.length > 0 ? (
        <ul className="mb-2 space-y-2">
          {attachments.map((item) => (
            <li
              key={item.url}
              className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px]"
              style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <FileText size={15} aria-hidden style={{ color: "var(--accent)" }} />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {formatBytes(item.size) ? (
                <span className="shrink-0 text-[11px]" style={{ color: "var(--foreground-muted)" }}>
                  {formatBytes(item.size)}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onChange(attachments.filter((other) => other.url !== item.url))}
                disabled={disabled}
                aria-label={`${item.name} 첨부 제거`}
                className="shrink-0 rounded-full p-1 hover:opacity-70"
                style={{ color: "var(--foreground-muted)" }}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        ref={inputRef}
        type="file"
                className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={pick}
        disabled={disabled || uploading || attachments.length >= POST_MAX_ATTACHMENTS}
        className="flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
      >
        {uploading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <FileText size={14} aria-hidden />}
        {uploading ? "업로드 중…" : "파일 첨부"}
      </button>
    </div>
  );
}
