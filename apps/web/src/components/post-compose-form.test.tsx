import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PostComposeValues } from "@/data/posts";
import { PostComposeForm } from "./post-compose-form";

vi.mock("@/components/rich-text-editor-dynamic", () => ({
  RichTextEditor: ({
    id,
    value,
    onChange,
    placeholder,
  }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      id={id}
      aria-label={placeholder ?? "내용"}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  ),
}));

vi.mock("@/components/image-file-upload-button", () => ({
  ImageFileUploadButton: ({ disabled }: { disabled?: boolean }) => (
    <button type="button" disabled={disabled}>
      파일 업로드
    </button>
  ),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

const baseValues: PostComposeValues = {
  text: "업사이클 기록",
  images: [],
  tags: [],
  event: "",
};

describe("PostComposeForm", () => {
  it("이미지 URL을 추가하고 제거한다", () => {
    const onChange = vi.fn();
    const { rerender } = render(<PostComposeForm values={baseValues} onChange={onChange} events={[]} />);

    fireEvent.change(screen.getByPlaceholderText("https://example.com/image.jpg"), {
      target: { value: "https://example.com/a.jpg" },
    });
    fireEvent.click(screen.getByRole("button", { name: "이미지 URL 추가" }));

    expect(onChange).toHaveBeenCalledWith({
      ...baseValues,
      images: ["https://example.com/a.jpg"],
    });

    const valuesWithImage = { ...baseValues, images: ["https://example.com/a.jpg"] };
    rerender(<PostComposeForm values={valuesWithImage} onChange={onChange} events={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "이미지 URL 제거: https://example.com/a.jpg" }));

    expect(onChange).toHaveBeenLastCalledWith({
      ...valuesWithImage,
      images: [],
    });
  });

  it("화살표 버튼으로 이미지 순서를 바꾼다", () => {
    const onChange = vi.fn();
    const values = { ...baseValues, images: ["https://example.com/a.jpg", "https://example.com/b.jpg"] };
    render(<PostComposeForm values={values} onChange={onChange} events={[]} />);

    // 첫 항목은 위로 이동 불가, 마지막 항목은 아래로 이동 불가
    expect(
      (screen.getByRole("button", { name: "이미지 순서 위로: https://example.com/a.jpg" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "이미지 순서 아래로: https://example.com/b.jpg" }) as HTMLButtonElement).disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "이미지 순서 아래로: https://example.com/a.jpg" }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...values,
      images: ["https://example.com/b.jpg", "https://example.com/a.jpg"],
    });

    fireEvent.click(screen.getByRole("button", { name: "이미지 순서 위로: https://example.com/b.jpg" }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...values,
      images: ["https://example.com/b.jpg", "https://example.com/a.jpg"],
    });
  });

  it("https 가 아닌 이미지 URL(ftp·외부 http)은 추가하지 않는다", () => {
    const onChange = vi.fn();
    render(<PostComposeForm values={baseValues} onChange={onChange} events={[]} />);
    const input = screen.getByPlaceholderText("https://example.com/image.jpg");

    fireEvent.change(input, { target: { value: "ftp://example.com/a.jpg" } });
    fireEvent.click(screen.getByRole("button", { name: "이미지 URL 추가" }));
    expect(screen.getByRole("alert").textContent).toBe("https:// 로 시작하는 이미지 URL을 입력해주세요.");
    expect(onChange).not.toHaveBeenCalled();

    // 추적 픽셀 방어 — 외부 http 도 거부한다(로컬 http 만 예외).
    fireEvent.change(input, { target: { value: "http://tracker.example/pixel.gif" } });
    fireEvent.click(screen.getByRole("button", { name: "이미지 URL 추가" }));
    expect(screen.getByRole("alert").textContent).toBe("https:// 로 시작하는 이미지 URL을 입력해주세요.");
    expect(onChange).not.toHaveBeenCalled();
  });
});
