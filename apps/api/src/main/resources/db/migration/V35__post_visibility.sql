-- 게시글 공개 범위. MEMBERS = 로그인(승인 교인)만 열람 — 기도(PRAYER) 카테고리 전용.
ALTER TABLE `posts`
    ADD COLUMN `visibility` varchar(20) NOT NULL DEFAULT 'PUBLIC';
