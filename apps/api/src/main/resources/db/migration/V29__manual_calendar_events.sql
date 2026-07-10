-- 관리자 수동 등록 일정(절기 행사·심방·환영회 등). 표시 전용 — 모집·참여 없음.
CREATE TABLE `manual_calendar_events` (
  `id` varchar(255) NOT NULL,
  `title` varchar(100) NOT NULL,
  `type` varchar(20) NOT NULL,
  `start_date` varchar(10) NOT NULL,
  `end_date` varchar(10) DEFAULT NULL,
  `start_time` varchar(20) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `created_by` varchar(50) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_manual_calendar_start_date` (`start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
