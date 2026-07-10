-- 행사 실무 안내 필드(전부 선택). null 이면 프론트 상세에서 해당 행을 숨긴다.
ALTER TABLE `events`
  ADD COLUMN `place` varchar(200) DEFAULT NULL,
  ADD COLUMN `audience` varchar(200) DEFAULT NULL,
  ADD COLUMN `fee` varchar(200) DEFAULT NULL,
  ADD COLUMN `supplies` varchar(500) DEFAULT NULL,
  ADD COLUMN `contact` varchar(200) DEFAULT NULL;
