// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUpload, PhotoListUpload } from "@/components/file-upload";

const upload = vi.hoisted(() => ({ checkFile: vi.fn(), uploadFile: vi.fn() }));
vi.mock("@/lib/upload", async (orig) => ({ ...(await orig<typeof import("@/lib/upload")>()), checkFile: upload.checkFile, uploadFile: upload.uploadFile }));

const file = (name = "a.png", type = "image/png") => new File(["x"], name, { type });

describe("FileUpload", () => {
  it("uploads a picked file with progress, and reports problems", async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    const onUploadingChange = vi.fn();
    upload.checkFile.mockResolvedValueOnce("Too small").mockResolvedValue(null);
    let finish!: (url: string) => void;
    upload.uploadFile.mockImplementationOnce((_f: File, _p: string, progress: (n: number) => void) => {
      progress(40);
      return new Promise((r) => (finish = r));
    });
    render(<FileUpload value="" onChange={onChange} purpose="portfolio" id="pic" describedBy="hint" onUploadingChange={onUploadingChange} />);
    expect(screen.getByText(/at least 400 px/)).toBeInTheDocument();
    const input = document.getElementById("pic") as HTMLInputElement;
    await u.upload(input, file());
    expect(await screen.findByRole("alert")).toHaveTextContent("Too small");
    expect(input).toHaveAttribute("aria-describedby", "hint pic-upload-error");
    await u.upload(input, file());
    expect(await screen.findByText("Uploading 40%")).toBeInTheDocument();
    await act(async () => finish("https://u/1.webp"));
    expect(onChange).toHaveBeenCalledWith("https://u/1.webp");
    expect(onUploadingChange.mock.calls).toEqual([[true], [false]]);

    upload.uploadFile.mockRejectedValueOnce(new Error("Server said no"));
    await u.upload(input, file());
    expect(await screen.findByText("Server said no")).toBeInTheDocument();
    upload.uploadFile.mockRejectedValueOnce("odd");
    await u.upload(input, file());
    expect(await screen.findByText("Upload failed")).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [] } });
  });
  it("opens the file picker by click, keyboard and drop", async () => {
    const u = userEvent.setup();
    upload.checkFile.mockResolvedValue(null);
    upload.uploadFile.mockResolvedValue("https://u/doc.pdf");
    const onChange = vi.fn();
    render(<FileUpload value="" onChange={onChange} purpose="document" />);
    expect(screen.getByText(/JPG, PNG, WebP or PDF, up to 10 MB$/)).toBeInTheDocument();
    const zone = screen.getByRole("button", { name: "Upload a document" });
    const click = vi.spyOn(HTMLInputElement.prototype, "click");
    await u.click(zone);
    zone.focus();
    await u.keyboard("{Enter}");
    await u.keyboard(" ");
    await u.keyboard("a");
    expect(click).toHaveBeenCalledTimes(3);
    fireEvent.dragOver(zone);
    expect(zone.className).toContain("border-primary bg-accent");
    fireEvent.dragLeave(zone);
    fireEvent.drop(zone, { dataTransfer: { files: [file("d.pdf", "application/pdf")] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("https://u/doc.pdf"));
    fireEvent.drop(zone, { dataTransfer: {} });
  });
  it("ignores drops while disabled", () => {
    render(<FileUpload value="" onChange={vi.fn()} purpose="avatar" disabled invalid />);
    const zone = screen.getByRole("button", { name: "Upload an image" });
    expect(zone).toHaveAttribute("tabindex", "-1");
    fireEvent.drop(zone, { dataTransfer: { files: [file()] } });
    expect(upload.checkFile).not.toHaveBeenCalled();
  });
  it("shows an uploaded image or document with replace and remove", async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<FileUpload value="https://u/a.webp" onChange={onChange} purpose="avatar" previewClassName="size-24 rounded-full" />);
    expect(screen.getByAltText("Uploaded preview")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: /Remove/ }));
    expect(onChange).toHaveBeenCalledWith("");
    const click = vi.spyOn(HTMLInputElement.prototype, "click");
    await u.click(screen.getByRole("button", { name: /Replace/ }));
    expect(click).toHaveBeenCalled();
    rerender(<FileUpload value="https://u/doc.pdf?sig=1" onChange={onChange} purpose="document" />);
    expect(screen.getByText("Document uploaded")).toBeInTheDocument();
    rerender(<FileUpload value="https://u/scan.webp" onChange={onChange} purpose="document" />);
    expect(screen.getByAltText("Uploaded preview")).toHaveClass("max-h-48");
  });
});

describe("PhotoListUpload", () => {
  it("adds several photos, skipping bad ones, and removes them", async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    upload.checkFile.mockImplementation(async (f: File) => (f.name === "bad.png" ? "too small" : null));
    upload.uploadFile.mockImplementation(async (f: File, _p: string, progress: (n: number) => void) => {
      progress(50);
      return `https://u/${f.name}`;
    });
    const { rerender } = render(<PhotoListUpload value={["https://u/old.png"]} onChange={onChange} purpose="review" max={3} id="photos" />);
    expect(screen.getByText(/Up to 3 photos/)).toBeInTheDocument();
    await u.upload(document.getElementById("photos") as HTMLInputElement, [file("bad.png"), file("new.png"), file("extra.png")]);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(["https://u/old.png", "https://u/new.png"]));
    expect(screen.getByRole("alert")).toHaveTextContent("bad.png: too small");
    await u.click(screen.getByRole("button", { name: "Remove photo 1" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    const click = vi.spyOn(HTMLInputElement.prototype, "click");
    await u.click(screen.getByRole("button", { name: /Add photo/ }));
    expect(click).toHaveBeenCalled();
    rerender(<PhotoListUpload value={["a", "b", "c"]} onChange={onChange} purpose="review" max={3} />);
    expect(screen.queryByRole("button", { name: /Add photo/ })).toBeNull();
  });
  it("shows progress and reports upload failures", async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    const onUploadingChange = vi.fn();
    upload.checkFile.mockResolvedValue(null);
    let fail!: (e: unknown) => void;
    upload.uploadFile.mockImplementationOnce((_f: File, _p: string, progress: (n: number) => void) => {
      progress(30);
      return new Promise((_r, reject) => (fail = reject));
    });
    render(<PhotoListUpload value={[]} onChange={onChange} purpose="review" max={2} onUploadingChange={onUploadingChange} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    await u.upload(input, file());
    expect(await screen.findByText("30%")).toBeInTheDocument();
    await act(async () => fail(new Error("Network down")));
    expect(screen.getByRole("alert")).toHaveTextContent("Network down");
    expect(onChange).not.toHaveBeenCalled();
    upload.uploadFile.mockRejectedValueOnce("odd");
    await u.upload(input, file());
    expect(await screen.findByText("Upload failed")).toBeInTheDocument();
    fireEvent.change(input, { target: { files: null } });
    expect(onUploadingChange).toHaveBeenCalledWith(false);
  });
});
