-- 찬양팀 일정(리허설·파트 연습·전체 연습·예배 지원). visibility 로 교회 캘린더 공개 범위를 제어한다.
-- PRIVATE=찬양팀 내부, CHURCH=로그인 교인 공개, PUBLIC=외부(비로그인) 공개.
CREATE TABLE `praise_schedules` (
    `id` varchar(64) NOT NULL,
    `title` varchar(100) NOT NULL,
    `type` varchar(30) NOT NULL DEFAULT 'REHEARSAL',
    `start_at` datetime(6) NOT NULL,
    `end_at` datetime(6) DEFAULT NULL,
    `location` varchar(100) DEFAULT NULL,
    `memo` varchar(500) DEFAULT NULL,
    `visibility` varchar(20) NOT NULL DEFAULT 'PRIVATE',
    `setlist_id` varchar(64) DEFAULT NULL,
    `created_at` datetime(6) NOT NULL,
    `updated_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_praise_schedules_start_at` (`start_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
