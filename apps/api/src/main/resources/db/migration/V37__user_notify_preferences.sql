-- 알림 유형별 수신 설정: 댓글·답글·멘션 / 좋아요. 보안·운영 알림은 설정과 무관하게 전달된다.
-- H2(MySQL 모드)가 한 문장의 다중 ADD COLUMN 에서 DEFAULT 를 잃어 문장을 나눈다.
ALTER TABLE users ADD COLUMN notify_comments BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN notify_likes BOOLEAN NOT NULL DEFAULT TRUE;
