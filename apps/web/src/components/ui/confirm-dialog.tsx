"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useModalDialog } from "@/lib/use-modal-dialog";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type OpenState = ConfirmOptions & { open: true };

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OpenState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, ...options });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state ? <ConfirmDialogUI state={state} onClose={close} /> : null}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialogUI({ state, onClose }: { state: OpenState; onClose: (result: boolean) => void }) {
  // 네이티브 <dialog> 수명주기(showModal·Esc·backdrop 클릭)는 공용 훅이 처리한다.
  const { dialogRef, onBackdropClick } = useModalDialog(() => onClose(false));
  const cancelRef = useRef<HTMLButtonElement>(null);

  // 파괴적 액션 기본값 안전 — 열리면 취소 버튼에 초기 포커스.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="dialog-pop w-[calc(100%-2rem)] max-w-sm rounded-2xl border p-6 shadow-xl backdrop:bg-black/45"
      style={{
        background: "var(--panel)",
        borderColor: "rgba(var(--ink-rgb), 0.12)",
        color: "var(--foreground)",
      }}
      onClick={onBackdropClick}
    >
      <h2 id="confirm-dialog-title" className="text-[16px] font-semibold">
        {state.title ?? "확인"}
      </h2>
      <p id="confirm-dialog-desc" className="mt-2 whitespace-pre-line text-[14px] opacity-80">
        {state.message}
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={() => onClose(false)}
          className="rounded-full px-4 py-2 text-[13px] transition-colors hover:bg-white/10"
          style={{ color: "rgba(var(--ink-rgb), 0.8)" }}
        >
          {state.cancelLabel ?? "취소"}
        </button>
        <button
          type="button"
          onClick={() => onClose(true)}
          className={`rounded-full px-4 py-2 text-[13px] font-medium${state.destructive ? " cta-danger" : ""}`}
          style={
            state.destructive
              ? undefined
              : { background: "var(--accent)", color: "var(--surface-dark)" }
          }
        >
          {state.confirmLabel ?? "확인"}
        </button>
      </div>
    </dialog>
  );
}
