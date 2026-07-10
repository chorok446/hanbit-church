-- 공개 목록/검색 성능 인덱스. 모든 공개 read 경로가 hidden_at IS NULL 로 필터하고 seq 로 정렬하며,
-- 게시글은 category, 행사는 status 로 추가 필터한다. 기존 단일 인덱스로는 filesort/풀스캔이 발생한다.
CREATE INDEX `idx_posts_hidden_seq` ON `posts` (`hidden_at`, `seq`);
CREATE INDEX `idx_posts_category_hidden_seq` ON `posts` (`category`, `hidden_at`, `seq`);

CREATE INDEX `idx_events_hidden_seq` ON `events` (`hidden_at`, `seq`);
CREATE INDEX `idx_events_status_hidden_seq` ON `events` (`status`, `hidden_at`, `seq`);
