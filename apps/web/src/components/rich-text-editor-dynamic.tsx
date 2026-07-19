"use client";

import dynamic from "next/dynamic";

export type { RichTextEditorProps } from "./rich-text-editor";

// tiptap(@tiptap/react + starter-kit + 확장들, ~140KB)은 글쓰기 화면에서만 필요하다.
// 정적 import 하면 /posts/new·/news/write·/sermons/write·/events/new 초기 번들에 모두 실려
// 렌더에 필요 없는 코드가 First Load JS 를 크게 부풀린다. 동적 로드로 폼 골격은 즉시 뜨고
// 에디터만 뒤이어 붙는다(ssr:false — 편집기는 클라이언트 전용).
export const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="rich-text-editor overflow-hidden rounded-2xl border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        aria-hidden
      >
        <div className="h-11 border-b" style={{ borderColor: "var(--border)" }} />
        <div className="h-40 animate-pulse" style={{ background: "var(--surface)" }} />
      </div>
    ),
  },
);
