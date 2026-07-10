-- 행사 '수정됨' 표시용(게시글 V43 과 대칭). null = 수정 이력 없음.
ALTER TABLE events ADD COLUMN updated_at TIMESTAMP NULL;
