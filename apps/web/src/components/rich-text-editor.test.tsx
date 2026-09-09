import React from "react";
import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RichTextEditor } from "./rich-text-editor";

afterEach(() => vi.restoreAllMocks());

it("에디터의 링크 확장은 중복 없이 한 번만 등록한다", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const { container } = render(
    <RichTextEditor id="test-editor" value="" onChange={() => {}} maxLength={1000} />,
  );
  await waitFor(() => expect(container.querySelector('[contenteditable="true"]')).not.toBeNull());
  expect(warn.mock.calls.filter(([message]) => String(message).includes("Duplicate extension names"))).toEqual([]);
});
