-- 기도벽(Prayer Wall). 좋아요와 결이 다른 기도 전용 반응 '함께 기도했어요'와 작성자의 '응답받았어요' 마킹.
-- prayed_count 는 좋아요(likes)와 같은 비정규화 카운터 — 목록 응답에서 반응 수를 N+1 없이 싣는다.
ALTER TABLE `posts` ADD COLUMN `prayed_count` INT NOT NULL DEFAULT 0;
-- 응답받은 기도제목 표시 시각. null = 미응답. 작성자 또는 스태프만 마킹(PRAYER 전용).
ALTER TABLE `posts` ADD COLUMN `answered_at` TIMESTAMP NULL;

-- 사용자별 '함께 기도했어요' 반응. (post_id, user_id) unique 로 중복 반응을 막는다 — 좋아요(post_likes)와 동형.
-- 익명 집계라 응답에는 카운트와 '내가 눌렀는지'만 노출하고 누가 눌렀는지는 드러내지 않는다.
CREATE TABLE `post_prayers` (
  `id` varchar(255) NOT NULL,
  `post_id` varchar(255) DEFAULT NULL,
  `user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_post_prayers_post_user` (`post_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
