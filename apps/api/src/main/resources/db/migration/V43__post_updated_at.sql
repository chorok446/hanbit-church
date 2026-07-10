-- 게시글 '수정됨' 표시용. null = 수정 이력 없음(댓글 updated_at 과 동일 의미).
ALTER TABLE posts ADD COLUMN updated_at TIMESTAMP NULL;
