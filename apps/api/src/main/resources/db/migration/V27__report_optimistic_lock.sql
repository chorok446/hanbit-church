-- 신고 처리 낙관적 락. 두 관리자가 같은 신고를 동시에 처리할 때 한 쪽만 성공시켜
-- 중복 알림·감사로그를 막는다(@Version). 기존 행은 0 으로 채운다.
ALTER TABLE `reports`
    ADD COLUMN `version` bigint NOT NULL DEFAULT 0;
