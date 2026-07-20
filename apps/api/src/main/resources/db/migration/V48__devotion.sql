-- 데일리 "오늘의 말씀" / 큐티 묵상. 하루 1개(devotion_date UNIQUE)씩 관리자가 본문+묵상글을 등록한다.
-- 공개 노출은 별도 publish 컬럼 없이 devotion_date <= 오늘(KST) 로 게이트한다 —
-- 미래 날짜로 미리 등록하면 그날이 되어야 공개된다(예약 게시 개념 재사용, 별도 잡 불필요).
CREATE TABLE `devotions` (
    `id` varchar(64) NOT NULL,
    `devotion_date` date NOT NULL,
    `verse_ref` varchar(120) NOT NULL,
    `verse_text` text NOT NULL,
    `meditation` text NOT NULL,
    `author_name` varchar(60) NOT NULL,
    `author_user_id` bigint DEFAULT NULL,
    `comments` int NOT NULL DEFAULT 0,
    `created_at` datetime(6) NOT NULL,
    `updated_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_devotions_date` (`devotion_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 큐티 은혜나눔 댓글. 게시글 댓글(post_comments)의 무거운 기능(답글·좋아요·신고·마스킹) 없이
-- 평면 구조로 경량 운영한다. created_at 오름차순(오래된 순) 정렬.
CREATE TABLE `devotion_comments` (
    `id` varchar(64) NOT NULL,
    `devotion_id` varchar(64) NOT NULL,
    `author_name` varchar(60) NOT NULL,
    `author_user_id` bigint DEFAULT NULL,
    `text` text NOT NULL,
    `created_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_devotion_comments_devotion` (`devotion_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
