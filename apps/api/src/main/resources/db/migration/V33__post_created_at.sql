-- 게시글 작성 시각. 지금까지는 time_label("방금 전" 고정 문자열)과 정렬용 seq 만 있어
-- 정확한 작성 시각을 어디에도 노출할 수 없었다.
ALTER TABLE `posts`
    ADD COLUMN `created_at` datetime(6) DEFAULT NULL;

-- 생성 게시글의 seq 는 epoch millis 라 작성시각을 복원할 수 있다. 시드(작은 인덱스 seq)는
-- 작성 시점을 알 수 없으므로 NULL 로 남긴다(정직한 표기 — users.created_at 과 동일 원칙).
UPDATE `posts`
    SET `created_at` = FROM_UNIXTIME(`seq` / 1000)
    WHERE `seq` > 1000000000000;
