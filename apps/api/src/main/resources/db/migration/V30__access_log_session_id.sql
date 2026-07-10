-- 접속 기록에 로그인 세션 식별자(JWT sid) 저장 — "현재 세션" 표시용. 과거 기록은 NULL.
ALTER TABLE `user_access_logs`
  ADD COLUMN `session_id` varchar(36) DEFAULT NULL;
