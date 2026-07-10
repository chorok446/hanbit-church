import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { UploadValidationError } from "@/lib/upload-media";
import { MAX_DOCUMENT_UPLOAD_BYTES, uploadDocument, uploadDocumentErrorMessage } from "./upload-document";

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch };
});

function fileOfSize(bytes: number): File {
  return new File([new Uint8Array(Math.min(bytes, 8))], "bulletin.pdf", { type: "application/pdf" });
}

describe("uploadDocument", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("10MB 초과는 서버 왕복 없이 즉시 거절한다", async () => {
    const big = fileOfSize(1);
    Object.defineProperty(big, "size", { value: MAX_DOCUMENT_UPLOAD_BYTES + 1 });
    await expect(uploadDocument(big)).rejects.toBeInstanceOf(UploadValidationError);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("성공 시 http(s) URL 만 통과시킨다", async () => {
    apiFetch.mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://cdn/x.pdf" })));
    await expect(uploadDocument(fileOfSize(8))).resolves.toBe("https://cdn/x.pdf");

    apiFetch.mockResolvedValueOnce(new Response(JSON.stringify({ url: "javascript:alert(1)" })));
    await expect(uploadDocument(fileOfSize(8))).rejects.toThrow("invalid upload response");
  });

  it("실패 응답은 ApiError 로 던진다", async () => {
    apiFetch.mockResolvedValueOnce(new Response(JSON.stringify({ detail: "unsupported document type" }), { status: 400 }));
    await expect(uploadDocument(fileOfSize(8))).rejects.toBeInstanceOf(ApiError);
  });
});

describe("uploadDocumentErrorMessage", () => {
  it("서버 detail 을 한국어 안내로 변환한다", () => {
    const tooLarge = new ApiError(400, "/api/media/document", undefined, { detail: "file is too large" });
    expect(uploadDocumentErrorMessage(tooLarge, "폴백")).toBe("문서는 10MB 이하여야 합니다.");
    const badType = new ApiError(400, "/api/media/document", undefined, { detail: "unsupported document type" });
    expect(uploadDocumentErrorMessage(badType, "폴백")).toBe("보안상 업로드할 수 없는 파일 형식입니다.");
    expect(uploadDocumentErrorMessage(new ApiError(401, "/x", undefined, undefined), "폴백")).toBe("로그인이 필요합니다.");
    expect(uploadDocumentErrorMessage(new ApiError(403, "/x", undefined, undefined), "폴백")).toBe(
      "관리자만 문서를 업로드할 수 있습니다.",
    );
  });

  it("검증 오류는 메시지를 그대로, 그 외는 폴백", () => {
    expect(uploadDocumentErrorMessage(new UploadValidationError("커스텀"), "폴백")).toBe("커스텀");
    expect(uploadDocumentErrorMessage(new Error("x"), "폴백")).toBe("폴백");
  });
});
