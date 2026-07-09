-- 게시글 조회수. 상세 조회마다 1 증가.
ALTER TABLE `posts`
    ADD COLUMN `views` bigint NOT NULL DEFAULT 0;
