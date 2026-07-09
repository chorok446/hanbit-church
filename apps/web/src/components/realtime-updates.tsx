"use client";

import { useEffect } from "react";
import { useAuthSession } from "@/lib/use-auth-session";
import { openNotificationSocket } from "@/lib/notification-ws";

/**
 * 로그인 동안 유지되는 배지 갱신용 WS 연결. 사용자 단위 알림 이벤트만 받아
 * notification-ws 가 전역 이벤트로 발행 → 헤더 알림 배지가 갱신된다.
 */
export function RealtimeUpdates() {
  const { sessionId } = useAuthSession();

  useEffect(() => {
    if (!sessionId) return;
    const socket = openNotificationSocket();
    return () => socket.close();
  }, [sessionId]);

  return null;
}
