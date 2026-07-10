-- 공지·주보 상단 고정. null = 고정 아님. 목록(LATEST)에서 고정 글이 먼저 온다.
ALTER TABLE posts ADD COLUMN pinned_at TIMESTAMP NULL;
