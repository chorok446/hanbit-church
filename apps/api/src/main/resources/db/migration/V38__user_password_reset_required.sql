-- 관리자 비밀번호 초기화 후 강제 변경 플래그. 임시 비밀번호로 로그인하면 변경을 안내한다.
ALTER TABLE users ADD COLUMN password_reset_required BOOLEAN NOT NULL DEFAULT FALSE;
