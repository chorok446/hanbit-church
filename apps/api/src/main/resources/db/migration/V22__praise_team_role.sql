-- 찬양팀 역할(사이트 role 과 분리). null = 찬양팀 아님. parts 는 복수 파트(json 배열).
ALTER TABLE `users`
    ADD COLUMN `praise_role` varchar(20) DEFAULT NULL,
    ADD COLUMN `praise_parts` json DEFAULT NULL;
