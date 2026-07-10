import { createHmac } from "node:crypto";

/** RFC 6238 TOTP (SHA-1, 6자리, 30초) — 2FA e2e 에서 인증 앱 역할을 한다. 백엔드 Totp.kt 와 동일 스펙. */
export function totpCode(base32Secret: string, at: Date = new Date()): string {
  const key = base32Decode(base32Secret);
  const step = Math.floor(at.getTime() / 1000 / 30);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(step));
  const hash = createHmac("sha1", key).update(message).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16) | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

function base32Decode(encoded: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = encoded.trim().toUpperCase().replace(/=+$/g, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error(`invalid base32 character: ${char}`);
    buffer = (buffer << 5) | value;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bytes.push((buffer >> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }
  return Buffer.from(bytes);
}
