-- 접속기록에 브라우저(User-Agent)와 IP 기반 대략적 국가·지역을 추가한다.
ALTER TABLE `user_access_logs`
    ADD COLUMN `browser` varchar(32) NOT NULL DEFAULT '알 수 없음',
    ADD COLUMN `country` varchar(64) DEFAULT NULL,
    ADD COLUMN `region` varchar(64) DEFAULT NULL;
