import { FileText } from "lucide-react";
import type { PostAttachment } from "@/data/posts";

function formatBytes(size?: number | null): string | null {
  if (!size || size <= 0) return null;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

/** 게시글 첨부파일(주보 PDF 등) 다운로드 링크 목록. 첨부가 없으면 렌더링하지 않는다. */
export function PostAttachments({ attachments }: { attachments?: PostAttachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <ul className="space-y-2" aria-label="첨부파일">
      {attachments.map((item) => (
        <li key={item.url}>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] transition-opacity hover:opacity-80 cta-outline"
          >
            <FileText size={15} aria-hidden style={{ color: "var(--accent)" }} />
            <span className="min-w-0 flex-1 truncate">{item.name || "첨부파일"}</span>
            {formatBytes(item.size) ? (
              <span className="shrink-0 text-[11px]" style={{ color: "var(--foreground-muted)" }}>
                {formatBytes(item.size)}
              </span>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
