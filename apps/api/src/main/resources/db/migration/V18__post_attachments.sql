-- 공지·주보 게시글의 파일 첨부(주보 PDF 등). 기존 json 컬럼(tags/images)과 같은 패턴.
ALTER TABLE `posts`
    ADD COLUMN `attachments` json DEFAULT NULL;
