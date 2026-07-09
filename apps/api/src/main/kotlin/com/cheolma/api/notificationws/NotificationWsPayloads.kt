package com.cheolma.api.notificationws

/**
 * 헤더 알림 배지 갱신용 payload. WS 엔드포인트(/ws/messages)는 원래 DM 용이었으나
 * DM 제거 후 사용자 단위 알림 배지 전용으로 재사용한다. 대화와 무관한 사용자 단위 이벤트다.
 */
data class NotificationBadgePayload(
    val unreadCount: Long,
)

/** 다중 API replica 간 Redis fan-out 봉투. 알림 배지 이벤트만 실어 나른다. */
data class NotificationRelayEnvelope(
    val origin: String = "",
    val userId: Long? = null,
    val payload: NotificationBadgePayload? = null,
)
