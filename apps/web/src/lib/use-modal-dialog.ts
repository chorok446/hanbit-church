"use client";

import { useEffect, useRef } from "react";

/**
 * 네이티브 <dialog> 모달 공용 수명주기 — 확인 다이얼로그·이미지 라이트박스가 공유한다.
 * - 마운트 시 showModal()(포커스 트랩·top-layer), 언마운트 시 close().
 * - Esc(cancel)는 브라우저 기본 auto-close 대신 onClose 로 통일해 부모 상태를 함께 정리한다.
 * - onClose 는 latest-ref 로 참조해 인라인 함수를 넘겨도 다이얼로그가 닫혔다 재열리지 않는다.
 * - onBackdropClick: 콘텐츠/패딩 밖(backdrop) 클릭만 닫는다. target 검사로 버블된
 *   키보드 클릭(clientX/Y=0, target=버튼)을 배제하고, rect 검사로 패딩 영역 클릭을 배제한다.
 */
export function useModalDialog(onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.showModal();
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.close();
    };
  }, []);

  const onBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inDialog =
      rect.top <= event.clientY && event.clientY <= rect.bottom && rect.left <= event.clientX && event.clientX <= rect.right;
    if (!inDialog) onCloseRef.current();
  };

  return { dialogRef, onBackdropClick };
}
