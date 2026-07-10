-- 접속 기록 보존 기간 삭제(DELETE ... WHERE accessed_at < :before)용 인덱스.
-- 기존 복합 인덱스(user_id, accessed_at)는 user_id 선행이라 이 쿼리를 못 타 풀스캔이었다.
ALTER TABLE `user_access_logs`
    ADD INDEX `idx_user_access_logs_accessed_at` (`accessed_at`);
