import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Photo } from "@/features/media/components/PhotoPicker";
import { useAttachments } from "@/features/media/useAttachments";

/**
 * The one thing worth a test in this hook: a section that holds files cannot be
 * emptied by the tap that hides it.
 *
 * A discarded photograph is unrecoverable — the original `File` is gone, only a
 * downscaled blob was ever kept, and nothing is uploaded until Save — so the
 * regression this guards against loses somebody's data for good.
 */

function photo(name: string): Photo {
  return {
    blob: new Blob(["x"], { type: "image/jpeg" }),
    filename: name,
    previewUrl: `blob:${name}`,
  } as Photo;
}

describe("useAttachments", () => {
  it("keeps the photographs when the section is toggled off", () => {
    const revoke = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const { result } = renderHook(() => useAttachments(["photo"]));

    act(() => result.current.addPhotos([photo("a.jpg"), photo("b.jpg")]));
    expect(result.current.holds("photo")).toBe(true);

    act(() => result.current.toggle("photo"));

    expect(result.current.photos).toHaveLength(2);
    expect(result.current.isActive("photo")).toBe(true);
    expect(revoke).not.toHaveBeenCalled();

    revoke.mockRestore();
  });

  it("empties and revokes only once discard is called", () => {
    const revoke = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const { result } = renderHook(() => useAttachments(["photo"]));

    act(() => result.current.addPhotos([photo("a.jpg")]));
    act(() => result.current.discard("photo"));

    expect(result.current.photos).toHaveLength(0);
    expect(result.current.isActive("photo")).toBe(false);
    expect(revoke).toHaveBeenCalledWith("blob:a.jpg");

    revoke.mockRestore();
  });

  it("still toggles a section that holds nothing", () => {
    const { result } = renderHook(() => useAttachments(["text"]));

    act(() => result.current.toggle("photo"));
    expect(result.current.isActive("photo")).toBe(true);

    act(() => result.current.toggle("photo"));
    expect(result.current.isActive("photo")).toBe(false);
  });
});
