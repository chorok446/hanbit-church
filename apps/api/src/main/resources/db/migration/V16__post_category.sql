-- 게시글 카테고리(공지/주보/설교/나눔/기도요청). 기존 글은 나눔(SHARING)으로 분류한다.
ALTER TABLE `posts`
    ADD COLUMN `category` varchar(20) NOT NULL DEFAULT 'SHARING';

CREATE INDEX `idx_posts_category` ON `posts` (`category`);
