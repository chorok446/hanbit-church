-- 댓글 테이블 인덱스 보강. 상세 조회 정렬(post_id, seq)과 계정 삭제·프로필 동기화의
-- 작성자(author_user_id) 갱신 경로가 인덱스 없이 풀스캔이었다.
-- parent_id 인덱스는 V14 가 이미 생성했다(엔티티 @Table 선언에만 누락돼 있었음).
CREATE INDEX idx_post_comments_post_seq ON post_comments (post_id, seq);
CREATE INDEX idx_post_comments_author_user_id ON post_comments (author_user_id);
CREATE INDEX idx_event_comments_author_user_id ON event_comments (author_user_id);
