/**
 * 화면 표시용 개인정보 마스킹 유틸.
 * 마스킹은 표시 전용이다 — tel: 링크 등 실제 동작에는 원본 값을 그대로 쓴다.
 */

/**
 * 전화번호 표시 마스킹: "010-1234-5678" → "010-1234-****".
 * 하이픈 유무와 무관하게 숫자만 뽑아 3-중간-4 형태로 재조립하고 끝 4자리를 가린다.
 * 형식을 알 수 없을 만큼 짧으면 전체를 가린다.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 9) {
    const head = digits.slice(0, 3);
    const mid = digits.slice(3, -4);
    return `${head}-${mid}-****`;
  }
  if (digits.length > 4) return `${digits.slice(0, -4)}****`;
  return "****";
}

/**
 * IP 표시 마스킹: 마지막 옥텟을 가린다. "203.0.113.42" → "203.0.113.*".
 * IPv6 등 점 4개 형식이 아니면 뒤쪽 절반을 가린다.
 */
export function maskIp(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts.slice(0, 3).join(".")}.*`;
  const keep = Math.ceil(ip.length / 2);
  return `${ip.slice(0, keep)}${"*".repeat(Math.max(1, ip.length - keep))}`;
}
