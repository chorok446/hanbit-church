import { Fragment, type ReactNode } from "react";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 검색어 매칭 부분을 <mark>(골드 틴트 + bold)로 강조.
 * split 기반 안전 렌더 — dangerouslySetInnerHTML 미사용, 대소문자 무시.
 */
export function SearchHighlight({ text, query }: { text: string; query?: string }): ReactNode {
  const keyword = query?.trim();
  if (!keyword) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegExp(keyword)})`, "gi"));
  if (parts.length === 1) return <>{text}</>;

  const lowered = keyword.toLowerCase();
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === lowered ? (
          <mark
            key={index}
            className="rounded-[3px] font-bold"
            style={{ background: "var(--accent-soft)", color: "inherit" }}
          >
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
