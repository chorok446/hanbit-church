-- 회원가입 관리자 승인제. null = 승인 대기(로그인 불가). 기존 사용자는 전원 승인 처리.
ALTER TABLE `users`
    ADD COLUMN `approved_at` datetime(6) DEFAULT NULL;

UPDATE `users`
SET `approved_at` = COALESCE(`created_at`, CURRENT_TIMESTAMP(6))
WHERE `approved_at` IS NULL;
