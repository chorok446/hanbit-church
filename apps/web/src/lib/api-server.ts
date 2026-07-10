// 서버 컴포넌트 전용 — next/headers 를 import 하므로 클라이언트 번들에 넣으면 안 된다.
import { cookies } from "next/headers";
import { ApiError } from "./api";
import { getServerApiBaseUrl } from "./api-url";

/**
 * SSR 상세 전용 GET: 브라우저 요청의 쿠키(httpOnly 인증 포함)를 API 로 전달해
 * 개인화된 응답을 받는다 — ownedByMe 계산, 숨김 글 작성자 본인 열람이 SSR 에서도 동작한다.
 * (기존 apiGetOrNull 은 쿠키 없이 호출되어 작성자도 자기 숨김 글 상세가 404 였다.)
 * 쿠키를 쓰므로 라우트는 요청마다 렌더된다(상세는 원래 dynamic — 캐시 손해 없음).
 */
export async function apiGetOrNullWithCookies<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${getServerApiBaseUrl()}${path}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(res.status, path);
  return res.json() as Promise<T>;
}
