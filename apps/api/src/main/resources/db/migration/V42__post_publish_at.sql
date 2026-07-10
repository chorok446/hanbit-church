-- 공지·주보 예약 게시 시각. 예약 글은 hidden_at + hidden_reason(예약 마커)으로 공개에서 제외되고
-- ScheduledPublishJob 이 도래 시 공개 전환한다. publish_at 은 게시 후에도 기록으로 남는다.
ALTER TABLE posts ADD COLUMN publish_at TIMESTAMP NULL;
