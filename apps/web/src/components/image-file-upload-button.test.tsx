import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageFileUploadButton } from "./image-file-upload-button";

const uploadMedia = vi.fn<(file: File) => Promise<string>>();

vi.mock("@/lib/upload-media", () => ({
  uploadMedia: (file: File) => uploadMedia(file),
  uploadMediaErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback,
}));

function pickFiles(files: File[]) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("file input not found");
  fireEvent.change(input, { target: { files } });
}

const file = (name: string) => new File(["x"], name, { type: "image/png" });

describe("ImageFileUploadButton", () => {
  beforeEach(() => {
    uploadMedia.mockReset();
  });

  it("단일 모드는 onUploaded 로 URL 하나를 전달한다", async () => {
    uploadMedia.mockResolvedValueOnce("https://cdn/a.png");
    const onUploaded = vi.fn();
    render(<ImageFileUploadButton onUploaded={onUploaded} />);

    expect(document.querySelector('input[type="file"]')).not.toHaveProperty("multiple", true);
    pickFiles([file("a.png")]);

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith("https://cdn/a.png"));
    expect(uploadMedia).toHaveBeenCalledTimes(1);
  });

  it("다중 모드는 순서대로 업로드해 onUploadedMany 를 한 번 호출한다", async () => {
    uploadMedia.mockResolvedValueOnce("https://cdn/1.png").mockResolvedValueOnce("https://cdn/2.png");
    const onUploadedMany = vi.fn();
    render(<ImageFileUploadButton maxFiles={3} onUploadedMany={onUploadedMany} />);

    expect(document.querySelector('input[type="file"]')).toHaveProperty("multiple", true);
    pickFiles([file("1.png"), file("2.png")]);

    await waitFor(() => expect(onUploadedMany).toHaveBeenCalledTimes(1));
    expect(onUploadedMany).toHaveBeenCalledWith(["https://cdn/1.png", "https://cdn/2.png"]);
  });

  it("일부 실패 시 성공분은 전달하고 실패 파일명을 알린다", async () => {
    uploadMedia
      .mockResolvedValueOnce("https://cdn/ok.png")
      .mockRejectedValueOnce(new Error("이미지는 5MB 이하여야 합니다."));
    const onUploadedMany = vi.fn();
    render(<ImageFileUploadButton maxFiles={3} onUploadedMany={onUploadedMany} />);

    pickFiles([file("ok.png"), file("big.png")]);

    await waitFor(() => expect(onUploadedMany).toHaveBeenCalledWith(["https://cdn/ok.png"]));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("big.png");
    expect(alert.textContent).toContain("5MB");
  });

  it("maxFiles 를 넘겨 선택하면 초과분은 제외하고 안내한다", async () => {
    uploadMedia.mockResolvedValueOnce("https://cdn/1.png").mockResolvedValueOnce("https://cdn/2.png");
    const onUploadedMany = vi.fn();
    render(<ImageFileUploadButton maxFiles={2} onUploadedMany={onUploadedMany} />);

    pickFiles([file("1.png"), file("2.png"), file("3.png")]);

    await waitFor(() => expect(onUploadedMany).toHaveBeenCalledWith(["https://cdn/1.png", "https://cdn/2.png"]));
    expect(uploadMedia).toHaveBeenCalledTimes(2);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("1개는 제외");
  });
});
