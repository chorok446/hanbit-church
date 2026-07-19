// 라우트 이동 시 페이지 콘텐츠 fade + rise 진입. 헤더/푸터(layout)는 고정.
// template 은 라우트 전환마다 리마운트되므로 CSS 마운트 애니메이션(`.stagger`)이 매 전환 재생된다.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="stagger" style={{ "--reveal-y": "12px", "--reveal-dur": "350ms" } as React.CSSProperties}>
      {children}
    </div>
  );
}
