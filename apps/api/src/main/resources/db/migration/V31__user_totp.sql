-- 2단계 인증(TOTP). secret 저장 후 enabled_at 이 채워져야 활성.
ALTER TABLE `users`
  ADD COLUMN `totp_secret` varchar(64) DEFAULT NULL,
  ADD COLUMN `totp_enabled_at` datetime(6) DEFAULT NULL;
