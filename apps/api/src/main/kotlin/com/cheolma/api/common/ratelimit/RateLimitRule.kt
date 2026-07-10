package com.cheolma.api.common.ratelimit

enum class RateLimitRule(val keySegment: String) {
    AUTH_LOGIN("auth:login:ip"),
    /** IP 와 별개로 특정 계정(email)당 로그인 시도를 제한한다 — 분산 IP 를 통한 단일 계정 표적 추측 방지. */
    AUTH_LOGIN_ACCOUNT("auth:login:account"),
    AUTH_SIGNUP("auth:signup:ip"),
    COMMENT_CREATE("comment:create:ip"),
    REPORT_CREATE("report:create:ip"),
    MEDIA_UPLOAD("media:upload:ip"),
    ;

    fun bucketKey(clientIp: String): String = "rate-limit:$keySegment:$clientIp"
}
