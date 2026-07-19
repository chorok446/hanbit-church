-- LATEST 정렬 전용 인덱스. 공개 검색 LATEST 는 category 별로 pinned_at DESC(고정 우선), seq DESC 로 정렬한다.
-- 기존 idx_posts_category_hidden_seq (category, hidden_at, seq) 는 pinned_at 이 빠져 있어 공지·주보처럼
-- 고정이 있는 카테고리 LATEST 쿼리가 filesort 를 탄다. 정렬 컬럼(pinned_at)을 seq 앞에 포함해 인덱스만으로
-- 정렬을 마치게 한다(hidden_at IS NULL 필터 + category 등가 조건과 함께).
CREATE INDEX `idx_posts_category_hidden_pinned_seq` ON `posts` (`category`, `hidden_at`, `pinned_at`, `seq`);
