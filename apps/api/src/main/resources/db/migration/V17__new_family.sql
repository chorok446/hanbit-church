-- 새가족 등록 신청. 비로그인 방문자의 연락 요청이라 users 와 연결하지 않는다.
-- 개인정보(이름·연락처) 포함 → 조회는 관리자 API 전용.
CREATE TABLE `new_family_registrations` (
    `id` varchar(64) NOT NULL,
    `name` varchar(30) NOT NULL,
    `phone` varchar(20) NOT NULL,
    `note` text DEFAULT NULL,
    `created_at` datetime(6) NOT NULL,
    `contacted_at` datetime(6) DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_new_family_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
