import { ApiError, apiErrorMessage, apiFetch } from "@/lib/api";
import { UploadValidationError } from "@/lib/upload-media";

type MediaUploadResponse = { url: string };

/** 서버 MediaUploadService.MAX_DOCUMENT_BYTES 와 동일한 한도. 서버 왕복 전에 즉시 안내한다. */
export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;

/** 공지·주보·설교 첨부용 파일 업로드(스태프 전용 API). 실행형 파일 외 모든 형식 허용. */
export async function uploadDocument(file: File): Promise<string> {
  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    throw new UploadValidationError("문서는 10MB 이하여야 합니다.");
  }
  const form = new FormData();
  form.append("file", file);

  // apiFetch 경유: access 토큰 만료(401) 시 refresh 후 1회 재시도가 업로드에도 적용된다.
  const res = await apiFetch("/api/media/document", { method: "POST", body: form });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    throw new ApiError(res.status, "/api/media/document", undefined, body);
  }

  const data = (await res.json()) as MediaUploadResponse;
  if (!data.url?.startsWith("http://") && !data.url?.startsWith("https://")) {
    throw new Error("invalid upload response");
  }
  return data.url;
}

export function uploadDocumentErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof UploadValidationError) return error.message;
  if (error instanceof ApiError) {
    const detail = apiErrorMessage(error, "");
    if (detail.includes("file is too large")) return "문서는 10MB 이하여야 합니다.";
    if (detail.includes("unsupported document type")) return "보안상 업로드할 수 없는 파일 형식입니다.";
    if (detail.includes("file is required")) return "업로드할 파일을 선택해주세요.";
    if (error.status === 401) return "로그인이 필요합니다.";
    if (error.status === 403) return "관리자만 문서를 업로드할 수 있습니다.";
    return detail || fallback;
  }
  return fallback;
}
