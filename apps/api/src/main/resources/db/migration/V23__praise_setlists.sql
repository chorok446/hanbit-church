-- 찬양팀 콘티(세트리스트)와 파트 배정.
-- 곡·공지는 콘티에 종속된 문서 성격이라 JSON 컬럼으로 단순화(posts.tags 패턴),
-- 배정·참석은 본인 참석 변경(user_id 매칭)·유니크 제약이 필요해 별도 테이블로 둔다.
CREATE TABLE `praise_setlists` (
    `id` varchar(64) NOT NULL,
    `title` varchar(100) NOT NULL,
    `worship_date` date NOT NULL,
    `worship_type` varchar(50) NOT NULL,
    `rehearsal_time` varchar(100) DEFAULT NULL,
    `service_time` varchar(50) DEFAULT NULL,
    `location` varchar(100) DEFAULT NULL,
    `leader_user_id` bigint DEFAULT NULL,
    `status` varchar(20) NOT NULL DEFAULT 'DRAFT',
    `songs` json NOT NULL,
    `notices` json DEFAULT NULL,
    `created_at` datetime(6) NOT NULL,
    `updated_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_praise_setlists_worship_date` (`worship_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `praise_assignments` (
    `id` varchar(64) NOT NULL,
    `setlist_id` varchar(64) NOT NULL,
    `user_id` bigint NOT NULL,
    `display_name` varchar(60) NOT NULL,
    `part` varchar(30) NOT NULL,
    `attendance_status` varchar(20) NOT NULL DEFAULT 'PENDING',
    `memo` varchar(500) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_praise_assignment` (`setlist_id`, `user_id`, `part`),
    KEY `idx_praise_assignments_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
