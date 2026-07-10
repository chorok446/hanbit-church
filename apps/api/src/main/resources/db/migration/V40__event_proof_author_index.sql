-- 계정 삭제(작성자 익명화)·프로필 동기화는 author_user_id 로 UPDATE 하는데,
-- uk(event_id, author_user_id)는 event-first 라 이 경로를 커버하지 못해 풀스캔이었다.
CREATE INDEX idx_event_proofs_author_user_id ON event_proofs (author_user_id);
