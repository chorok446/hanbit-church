package com.cheolma.api.common.ratelimit

interface RateLimitBucketStore {
    fun tryConsume(key: String, limit: Int, windowSeconds: Long): RateLimitResult
}
