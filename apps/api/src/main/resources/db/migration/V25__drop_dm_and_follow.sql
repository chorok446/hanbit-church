-- DM(메시지)·팔로우 기능 제거 (dasida 포크 잔재 정리).
-- V3(user_follows), V4(conversations/conversation_members/messages) 로 생성된 테이블을 드롭한다.
-- 주의: user_blocks 도 V4 에서 생성됐으나 차단 기능은 유지하므로 드롭하지 않는다.
-- FK 제약이 없어 순서 의존성은 없지만, 자식(messages/members)→부모(conversations) 순으로 드롭한다.

DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `conversation_members`;
DROP TABLE IF EXISTS `conversations`;
DROP TABLE IF EXISTS `user_follows`;
