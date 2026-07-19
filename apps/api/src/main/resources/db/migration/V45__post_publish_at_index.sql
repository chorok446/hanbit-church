-- ScheduledPublishJob 이 60초마다 publish_at <= now 를 조회한다. 인덱스가 없으면 매 분 posts 풀스캔이라
-- 테이블이 커질수록 상시 백그라운드 부하가 선형 증가한다. 발행 완료 글은 publish_at=NULL 로 비워지므로
-- (재발행 오판 차단, 2e682444) 대부분 행은 인덱스에서 빠져 범위 스캔이 거의 빈 구간이 된다.
CREATE INDEX idx_posts_publish_at ON posts (publish_at);
