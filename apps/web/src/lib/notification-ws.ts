import { getClientApiBaseUrl } from "@/lib/api-url";
import { emitNotificationsChanged } from "@/data/notifications";

export type NotificationSocket = {
  close: () => void;
};

// 백엔드 WS 엔드포인트는 /ws/messages 하나이며, 사용자 단위 알림(notification) 이벤트가
// 여기로 push 된다. DM UI 는 제거됐지만 알림 배지 갱신은 이 소켓으로 계속 받는다.
function wsUrl(): string {
  return `${getClientApiBaseUrl().replace(/^http/, "ws")}/ws/messages`;
}

/** 단일 연결·자동 재연결. JWT는 httpOnly 쿠키로 핸드셰이크에 실린다. */
export function openNotificationSocket(): NotificationSocket {
  let ws: WebSocket | null = null;
  let closed = false;
  let retryMs = 1500;
  let reconnectTimer: number | null = null;

  const connect = () => {
    if (closed) return;
    ws = new WebSocket(wsUrl());
    ws.onopen = () => {
      retryMs = 1500;
    };
    ws.onmessage = (event) => {
      let frame: { type?: string; payload?: Record<string, unknown> };
      try {
        frame = JSON.parse(String(event.data)) as typeof frame;
      } catch {
        return;
      }
      // 알림 배지 갱신 — 대화와 무관한 사용자 단위 이벤트. 그 외 프레임은 무시한다.
      if (frame.type === "notification" && typeof frame.payload?.unreadCount === "number") {
        emitNotificationsChanged({ unreadCount: frame.payload.unreadCount });
      }
    };
    ws.onclose = () => {
      // 첫 연결 실패도 재시도한다 — 성공 이력을 조건으로 걸면 로드 시점에 서버가 잠깐
      // 죽어 있던 세션은 알림 배지가 세션 내내 침묵한다. 백오프 상한 15초라 부하는 미미.
      if (closed) return;
      reconnectTimer = window.setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, 15_000);
    };
  };

  connect();

  return {
    close() {
      closed = true;
      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      ws?.close();
      ws = null;
    },
  };
}
