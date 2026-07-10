-- 익명 기도제목(PRAYER 전용). 공개 응답에서 작성자를 마스킹한다 — authorUserId 는 유지되어
-- 본인 수정/삭제와 알림은 그대로 동작한다.
ALTER TABLE `posts`
    ADD COLUMN `anonymous` bit(1) NOT NULL DEFAULT b'0';
