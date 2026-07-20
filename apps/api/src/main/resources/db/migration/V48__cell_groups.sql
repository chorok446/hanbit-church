-- 소그룹/목장(구역) 관리 — 로스터·모임 스케줄·모임기록(참석·나눔).
-- 찬양팀(praise) 도메인을 청사진으로 삼되, 목장은 "여러 그룹"이라 그룹별 로스터·리더가 필요해
-- users.praise_role 같은 단일 팀 컬럼이 아니라 그룹·멤버·모임 3테이블로 둔다.
CREATE TABLE `cell_groups` (
    `id` varchar(64) NOT NULL,
    `name` varchar(100) NOT NULL,
    `district` varchar(60) DEFAULT NULL,
    -- 목장을 인도하는 리더(구역장·목자). 표시·권한 판단용 — 참조만, FK 제약 없음.
    `leader_user_id` bigint DEFAULT NULL,
    `description` varchar(1000) DEFAULT NULL,
    `active` bit(1) NOT NULL DEFAULT b'1',
    `created_at` datetime(6) NOT NULL,
    `updated_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_cell_groups_active_name` (`active`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `cell_group_members` (
    `id` varchar(64) NOT NULL,
    `cell_group_id` varchar(64) NOT NULL,
    `user_id` bigint NOT NULL,
    -- 배정 당시 이름 snapshot(표시용) — 조회마다 users 조인하지 않는다.
    `display_name` varchar(60) NOT NULL,
    -- 그룹 내 역할. LEADER(구역장/부구역장)/MEMBER.
    `role_in_group` varchar(20) NOT NULL DEFAULT 'MEMBER',
    `joined_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_cell_group_member` (`cell_group_id`, `user_id`),
    KEY `idx_cell_group_members_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `cell_group_meetings` (
    `id` varchar(64) NOT NULL,
    `cell_group_id` varchar(64) NOT NULL,
    `title` varchar(100) NOT NULL,
    `meet_at` datetime(6) NOT NULL,
    `location` varchar(100) DEFAULT NULL,
    -- 모임 안내/주제(스케줄).
    `agenda` varchar(1000) DEFAULT NULL,
    -- 모임 후 나눔 기록(모임기록).
    `sharing_note` text,
    -- 참석 기록. [{userId, displayName, status}] JSON — 그룹 규모(수~수십)라 별도 테이블 없이 문서로 둔다.
    `attendance` json DEFAULT NULL,
    `created_at` datetime(6) NOT NULL,
    `updated_at` datetime(6) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_cell_group_meetings_group_meet_at` (`cell_group_id`, `meet_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
