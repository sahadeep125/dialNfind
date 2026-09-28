import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AreasEditor, DEFAULT_HOURS, HoursEditor, MAX_AREAS, normalizeHours, ServicesEditor, validateHours, validateServices } from "@/components/editors";
import { FileUpload } from "@/components/file-upload";
import { Field, FormAlert } from "@/components/form";
import { LocationFields, validateLocation, type LocationValue } from "@/components/location-fields";
import { MapPicker } from "@/components/map-picker";
import type { Hours, ProviderService, ServiceArea } from "@/lib/types";
import { categories, mockApi, pdfFile, pickOption, pngFile, renderWith, stubGeolocation, stubUploads } from "./helpers";

/** Holds a controlled value and shows it as JSON, so tests can read what the component set. */
function Harness<T>({ initial, children }: { initial: T; children: (value: T, set: (v: T) => void) => React.ReactNode }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      {children(value, setValue)}
      <pre data-testid="value">{JSON.stringify(value)}</pre>
    </>
  );
}
const value = <T,>() => JSON.parse(screen.getByTestId("value").textContent!) as T;

describe("hours editor", () => {
  const renderHours = (initial: Hours[] = DEFAULT_HOURS) =>
    renderWith(<Harness initial={initial}>{(v, set) => <HoursEditor value={v} onChange={set} />}</Harness>);

  it("validates and normalises hours", () => {
    expect(normalizeHours([{ dayOfWeek: 2, openTime: "10:00", closeTime: "11:00", is24x7: false }])[0]).toEqual({ dayOfWeek: 0, openTime: null, closeTime: null, is24x7: false });
    expect(validateHours(DEFAULT_HOURS)).toBeNull();
    expect(
      validateHours([
        { dayOfWeek: 1, openTime: "10:00", closeTime: null, is24x7: false },
        { dayOfWeek: 2, openTime: "10:00", closeTime: "09:00", is24x7: false },
        { dayOfWeek: 3, openTime: null, closeTime: null, is24x7: true },
      ]),
    ).toEqual({ 1: "Set both opening and closing times", 2: "Closing time must be after opening time" });
  });

  it("edits days, copies Monday, and shows errors", async () => {
    renderHours();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    const monOpen = screen.getByLabelText("Monday opening time");
    fireEvent.change(screen.getByLabelText("Monday closing time"), { target: { value: "08:00" } });
    expect(screen.getByText("Closing time must be after opening time")).toBeInTheDocument();
    expect(monOpen).toHaveAttribute("aria-describedby", "hours-1-error");
    fireEvent.change(screen.getByLabelText("Monday closing time"), { target: { value: "" } });
    expect(screen.getByText("Set both opening and closing times")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Monday closing time"), { target: { value: "18:00" } });
    fireEvent.change(monOpen, { target: { value: "" } });
    fireEvent.change(monOpen, { target: { value: "07:00" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Copy to Tue to Sat/ }));
    const hours = value<Hours[]>();
    expect(hours.filter((h) => h.openTime === "07:00" && h.closeTime === "18:00").map((h) => h.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6]);

    // Day switches: the first is 24x7, then Monday..Saturday, Sunday.
    const switches = screen.getAllByRole("switch");
    await userEvent.click(switches[1]!);
    expect(screen.queryByRole("button", { name: /Copy to Tue/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("switch")[7]!);
    expect(value<Hours[]>()[0]).toMatchObject({ openTime: "09:00", closeTime: "20:00" });
  });

  it("switches to 24x7 and back", async () => {
    renderHours([{ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", is24x7: false }]);
    await userEvent.click(screen.getAllByRole("switch")[0]!);
    expect(screen.queryByText("Monday")).not.toBeInTheDocument();
    expect(value<Hours[]>().every((h) => h.is24x7 && h.openTime === null)).toBe(true);
    await userEvent.click(screen.getAllByRole("switch")[0]!);
    expect(value<Hours[]>().every((h) => !h.is24x7 && h.openTime === "09:00")).toBe(true);
  });
});

describe("services editor", () => {
  const renderServices = (initial: ProviderService[] = []) => {
    mockApi({ "/categories": { categories } });
    return renderWith(<Harness initial={initial}>{(v, set) => <ServicesEditor value={v} onChange={set} />}</Harness>);
  };

  it("validates the list", () => {
    const s = (startingPrice: number | null): ProviderService => ({ categoryId: 1, subcategoryId: 11, startingPrice, priceUnit: "per_visit", isPrimary: true });
    expect(validateServices([])).toBe("Pick at least one service");
    expect(validateServices([s(null), s(100)])).toBeNull();
    expect(validateServices([s(-1)])).toBe("Fix the highlighted starting prices");
  });

  it("picks services, sets the main one, prices, units, and removes them", async () => {
    renderServices();
    await userEvent.click(await screen.findByRole("button", { name: "Electronics Repair" }));
    const [tv, ac] = screen.getAllByRole("checkbox");
    await userEvent.click(tv!);
    await userEvent.click(ac!);
    expect(value<ProviderService[]>().map((s) => [s.subcategoryId, s.isPrimary])).toEqual([
      [11, true],
      [12, false],
    ]);
    expect(screen.getByRole("button", { name: /Electronics Repair/ })).toHaveTextContent("2");
    await userEvent.click(screen.getAllByTitle("Set as main service")[1]!);
    expect(value<ProviderService[]>().map((s) => s.isPrimary)).toEqual([false, true]);

    const price = screen.getByLabelText("Starting price for TV Repair");
    for (const [input, message] of [
      ["-5", "Enter a price of 0 or more"],
      ["1.5", "Use whole rupees"],
      ["2000000", "Keep the price under Rs 10,00,000"],
    ] as const) {
      fireEvent.change(price, { target: { value: input } });
      expect(screen.getByRole("alert")).toHaveTextContent(message);
    }
    expect(price).toHaveAttribute("aria-describedby", "price-1-11");
    fireEvent.change(price, { target: { value: "" } });
    expect(value<ProviderService[]>()[0]!.startingPrice).toBeNull();
    fireEvent.change(price, { target: { value: "350" } });
    expect(value<ProviderService[]>()[0]!.startingPrice).toBe(350);

    await pickOption(screen.getAllByRole("combobox")[0]!, "Per hour");
    expect(value<ProviderService[]>()[0]!.priceUnit).toBe("per_hour");

    await userEvent.click(screen.getAllByRole("checkbox")[0]!);
    expect(value<ProviderService[]>().map((s) => s.subcategoryId)).toEqual([12]);
    await userEvent.click(screen.getByRole("button", { name: "Remove AC Repair" }));
    expect(value<ProviderService[]>()).toEqual([]);
    await userEvent.click(screen.getByRole("button", { name: "Plumbing" }));
    expect(screen.getByText("Services you offer in Plumbing")).toBeInTheDocument();
  });

  it("names services it cannot find in the category list", async () => {
    renderServices([
      { categoryId: 1, subcategoryId: 99, startingPrice: null, priceUnit: "fixed", isPrimary: true, subcategory: { id: 99, name: "Old name" } },
      { categoryId: 2, subcategoryId: null, startingPrice: null, priceUnit: "fixed", isPrimary: false },
      { categoryId: 9, subcategoryId: 98, startingPrice: null, priceUnit: "fixed", isPrimary: false },
    ]);
    expect(await screen.findByText("Old name")).toBeInTheDocument();
    expect(await screen.findByLabelText("Starting price for Plumbing")).toBeInTheDocument();
    expect(screen.getByText("Service")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Starting price for Plumbing"), { target: { value: "-1" } });
    expect(screen.getByLabelText("Starting price for Plumbing")).toHaveAttribute("aria-describedby", "price-2-all");
  });

  it("selects the first service's category once services arrive", async () => {
    mockApi({ "/categories": { categories } });
    function Late() {
      const [v, setV] = useState<ProviderService[]>([]);
      return (
        <>
          <button type="button" onClick={() => setV([{ categoryId: 2, subcategoryId: null, startingPrice: null, priceUnit: "fixed", isPrimary: true }])}>
            load
          </button>
          <ServicesEditor value={v} onChange={setV} />
        </>
      );
    }
    renderWith(<Late />);
    await screen.findByRole("button", { name: "Plumbing" });
    expect(screen.queryByText(/Services you offer in/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "load" }));
    expect(await screen.findByText("Services you offer in Plumbing")).toBeInTheDocument();
  });
});

const locations = [
  { label: "Andheri, Mumbai", name: "Andheri", city: "Mumbai", state: "Maharashtra", kind: "locality", latitude: 19.11, longitude: 72.85 },
  { label: "Pune", name: "Pune", city: "", state: "", kind: "city", latitude: 18.52, longitude: 73.85 },
];

describe("areas editor", () => {
  const renderAreas = (initial: ServiceArea[] = []) => {
    mockApi({ "/locations": { locations } });
    return renderWith(<Harness initial={initial}>{(v, set) => <AreasEditor value={v} onChange={set} />}</Harness>);
  };

  it("adds typed and searched areas, rejects bad ones, and removes them", async () => {
    renderAreas();
    expect(screen.getByText(/No areas yet/)).toBeInTheDocument();
    const input = screen.getByLabelText("Area name");
    await userEvent.type(input, "a{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter at least 2 characters");
    expect(input).toHaveAttribute("aria-describedby", "area-error");
    await userEvent.type(input, "b");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.type(input, "c");
    await userEvent.click(screen.getByRole("button", { name: /Add/ }));
    expect(value<ServiceArea[]>()).toEqual([{ areaName: "abc" }]);
    expect(input).toHaveValue("");
    fireEvent.change(input, { target: { value: "x".repeat(81) } });
    await userEvent.click(screen.getByRole("button", { name: /Add/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Keep the area name under 80 characters");
    fireEvent.change(input, { target: { value: "ABC" } });
    await userEvent.click(screen.getByRole("button", { name: /Add/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("ABC is already in your list");
    await userEvent.type(input, "{Shift}");

    await userEvent.click(screen.getByPlaceholderText("Add a locality you serve"));
    await userEvent.click(await screen.findByRole("button", { name: "Andheri, Mumbai" }));
    expect(value<ServiceArea[]>()[1]).toEqual({ areaName: "Andheri", latitude: 19.11, longitude: 72.85 });
    await userEvent.click(screen.getByRole("button", { name: "Remove abc" }));
    expect(value<ServiceArea[]>().map((a) => a.areaName)).toEqual(["Andheri"]);
  });

  it("stops at the area limit", async () => {
    renderAreas(Array.from({ length: MAX_AREAS }, (_, i) => ({ areaName: `Area ${i}` })));
    await userEvent.type(screen.getByLabelText("Area name"), "New place{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(`You can list up to ${MAX_AREAS} areas`);
  });

  it("closes the suggestions when the search loses focus", async () => {
    renderAreas();
    const search = screen.getByPlaceholderText("Add a locality you serve");
    await userEvent.click(search);
    await screen.findByRole("button", { name: "Pune" });
    await userEvent.click(document.body);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Pune" })).not.toBeInTheDocument());
  });
});

describe("location fields", () => {
  const base: LocationValue = { addressLine: "", locality: "", city: "", state: "", pincode: "", latitude: 26.7, longitude: 88.4, serviceRadiusKm: 10 };
  const renderLocation = (initial: LocationValue = base, errors: Parameters<typeof LocationFields>[0]["errors"] = null) =>
    renderWith(<Harness initial={initial}>{(v, set) => <LocationFields value={v} onChange={set} errors={errors} />}</Harness>);

  it("validates", () => {
    expect(validateLocation({ ...base, city: "Pune", state: "MH" })).toBeNull();
    expect(validateLocation({ ...base, pincode: "12" })).toEqual({ city: "Enter your city", state: "Enter your state", pincode: "Enter a valid 6-digit PIN code" });
  });

  it("fills the fields from a picked locality or city", async () => {
    mockApi({ "/locations": { locations } });
    renderLocation({ ...base, state: "West Bengal", locality: "Old" });
    await userEvent.click(screen.getByPlaceholderText("Search your locality or city"));
    await userEvent.click(await screen.findByRole("button", { name: "Andheri, Mumbai" }));
    expect(value<LocationValue>()).toMatchObject({ city: "Mumbai", state: "Maharashtra", locality: "Andheri", latitude: 19.11 });
    // The search keeps focus after a pick; leave it so focusing again reopens the list, and let the
    // 150 ms close that the blur schedules run first.
    await userEvent.tab();
    await act(async () => new Promise((r) => setTimeout(r, 200)));
    await userEvent.click(screen.getByPlaceholderText("Search your locality or city"));
    await userEvent.click(await screen.findByRole("button", { name: "Pune" }));
    expect(value<LocationValue>()).toMatchObject({ city: "Pune", state: "Maharashtra", locality: "Andheri", latitude: 18.52 });
  });

  it("edits fields, the pin and the radius, and shows errors", async () => {
    mockApi({});
    renderLocation(base, { city: "Enter your city" });
    expect(screen.getByLabelText(/^City/)).toHaveAttribute("aria-invalid", "true");
    await userEvent.type(screen.getByLabelText(/Street address/), "1 Road");
    await userEvent.type(screen.getByLabelText(/Locality/), "Hill");
    await userEvent.type(screen.getByLabelText(/^City/), "Goa");
    await userEvent.type(screen.getByLabelText(/^State/), "GA");
    await userEvent.type(screen.getByLabelText(/PIN code/), "40a0053999");
    expect(value<LocationValue>()).toMatchObject({ addressLine: "1 Road", locality: "Hill", city: "Goa", state: "GA", pincode: "400053" });
    await userEvent.click(screen.getByTestId("marker"));
    expect(value<LocationValue>()).toMatchObject({ latitude: 12.345679, longitude: 77.987654 });
    expect(screen.getByText(/\(12.3457, 77.9877\)/)).toBeInTheDocument();
    act(() => (globalThis as unknown as { __mapEvents: { click: (e: unknown) => void } }).__mapEvents.click({ latlng: { lat: 1.23456789, lng: 2.5 } }));
    expect(value<LocationValue>()).toMatchObject({ latitude: 1.234568, longitude: 2.5 });
    expect(screen.getByTestId("circle")).toHaveAttribute("data-radius", "10000");
    screen.getByRole("slider").focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(value<LocationValue>().serviceRadiusKm).toBe(11);
    expect(screen.getByText("11 km")).toBeInTheDocument();
  });

  it("uses the current location and fills empty fields from the reverse lookup", async () => {
    let answer: unknown = { location: { name: "Bandra", city: "Mumbai", state: "Maharashtra" } };
    mockApi({ "/locations/reverse": () => (answer === "fail" ? Promise.reject(new Error("offline")) : Promise.resolve(new Response(JSON.stringify(answer)))) });
    stubGeolocation({ lat: 19.0544444, lng: 72.8402222 });
    renderLocation();
    await userEvent.click(screen.getByRole("button", { name: /Use my current location/ }));
    await waitFor(() => expect(value<LocationValue>()).toMatchObject({ latitude: 19.054444, longitude: 72.840222, city: "Mumbai", state: "Maharashtra", locality: "Bandra" }));

    // Filled fields are kept, and a city-level answer does not set a locality.
    answer = { location: { name: "Mumbai", city: "Mumbai", state: "MH" } };
    stubGeolocation({ lat: 19.1, lng: 72.9 });
    await userEvent.click(screen.getByRole("button", { name: /Use my current location/ }));
    await waitFor(() => expect(value<LocationValue>().latitude).toBe(19.1));
    expect(value<LocationValue>()).toMatchObject({ city: "Mumbai", state: "Maharashtra", locality: "Bandra" });
  });

  it("keeps just the pin when the reverse lookup has no city or fails", async () => {
    let answer: unknown = { location: { name: "Sea", city: "", state: "" } };
    mockApi({ "/locations/reverse": () => (answer === "fail" ? Promise.reject(new Error("offline")) : Promise.resolve(new Response(JSON.stringify(answer)))) });
    stubGeolocation({ lat: 10, lng: 20 });
    renderLocation();
    await userEvent.click(screen.getByRole("button", { name: /Use my current location/ }));
    await waitFor(() => expect(value<LocationValue>()).toMatchObject({ latitude: 10, longitude: 20, city: "" }));
    answer = "fail";
    stubGeolocation({ lat: 11, lng: 21 });
    await userEvent.click(screen.getByRole("button", { name: /Use my current location/ }));
    await waitFor(() => expect(value<LocationValue>()).toMatchObject({ latitude: 11, city: "" }));
  });

  it("explains when the location cannot be read", async () => {
    mockApi({});
    stubGeolocation(null);
    renderLocation();
    await userEvent.click(screen.getByRole("button", { name: /Use my current location/ }));
    expect(await screen.findByText("Location is not supported in this browser")).toBeInTheDocument();
    stubGeolocation("error");
    await userEvent.click(screen.getByRole("button", { name: /Use my current location/ }));
    expect(await screen.findByText("Could not read your location")).toBeInTheDocument();
  });

  it("draws no radius circle without a radius", () => {
    render(<MapPicker lat={1} lng={2} onChange={vi.fn()} />);
    expect(screen.queryByTestId("circle")).not.toBeInTheDocument();
    expect(screen.getByTestId("marker")).toHaveTextContent("1,2");
  });
});

describe("file upload", () => {
  const renderUpload = (props: Partial<Parameters<typeof FileUpload>[0]> = {}, initial = "") => {
    const uploading = vi.fn();
    const view = render(
      <Harness initial={initial}>{(v, set) => <FileUpload purpose="logo" value={v} onChange={set} onUploadingChange={uploading} {...props} />}</Harness>,
    );
    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
    return { ...view, input, uploading };
  };

  it("uploads a picked image with progress, then replaces and removes it", async () => {
    stubUploads();
    const { input, uploading } = renderUpload({ previewClassName: "size-24 rounded-full" });
    const zone = screen.getByRole("button", { name: "Upload an image" });
    expect(zone).toHaveTextContent("JPG, PNG or WebP, up to 5 MB, at least 64 px");
    const click = vi.spyOn(input, "click");
    await userEvent.click(zone);
    fireEvent.keyDown(zone, { key: "Enter" });
    fireEvent.keyDown(zone, { key: " " });
    fireEvent.keyDown(zone, { key: "a" });
    expect(click).toHaveBeenCalledTimes(3);

    await userEvent.upload(input, pngFile());
    expect(await screen.findByText("Uploading 50%")).toBeInTheDocument();
    // Clicking while uploading does nothing.
    fireEvent.click(screen.getByRole("button", { name: "Upload an image" }));
    expect(click).toHaveBeenCalledTimes(3);
    expect(await screen.findByAltText("Uploaded preview")).toHaveAttribute("src", "http://cdn.test/logo.png");
    expect(value<string>()).toBe("http://cdn.test/logo.png");
    expect(uploading.mock.calls).toEqual([[true], [false]]);
    expect(input.value).toBe("");

    await userEvent.click(screen.getByRole("button", { name: /Replace/ }));
    expect(click).toHaveBeenCalledTimes(4);
    await userEvent.click(screen.getByRole("button", { name: /Remove/ }));
    expect(value<string>()).toBe("");
  });

  it("rejects bad files and shows upload errors", async () => {
    let answer: { status: number; body: unknown } | "throw" = { status: 413, body: { error: { message: "Too big for us" } } };
    stubUploads(() => answer);
    const { input } = renderUpload({ describedBy: "outer", id: "logo", invalid: true });
    expect(input).toHaveAttribute("aria-describedby", "outer");
    expect(input).toHaveAttribute("aria-invalid", "true");
    await userEvent.upload(input, new File(["x"], "a.txt", { type: "text/plain" }), { applyAccept: false });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a JPG, PNG or WebP image");
    expect(input).toHaveAttribute("aria-describedby", "outer logo-upload-error");
    await userEvent.upload(input, pngFile());
    expect(await screen.findByText("Too big for us")).toBeInTheDocument();
    answer = "throw";
    await userEvent.upload(input, pngFile());
    expect(await screen.findByText("Upload failed")).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [] } });
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("accepts dropped files, and ignores drops while disabled", async () => {
    stubUploads();
    const { rerender } = renderUpload({ purpose: "document" });
    const zone = screen.getByRole("button", { name: "Upload a document" });
    expect(zone).toHaveTextContent("JPG, PNG, WebP or PDF, up to 10 MB");
    expect(zone).not.toHaveTextContent("px");
    fireEvent.dragOver(zone);
    expect(zone.className).toContain("bg-accent");
    fireEvent.dragLeave(zone);
    expect(zone.className).not.toContain("bg-accent");
    fireEvent.drop(zone, { dataTransfer: { files: [pdfFile()] } });
    expect(await screen.findByText("Uploading 50%")).toBeInTheDocument();
    // Dropping again while uploading is ignored.
    fireEvent.drop(screen.getByRole("button", { name: "Upload a document" }), { dataTransfer: { files: [pdfFile()] } });
    await waitFor(() => expect(value<string>()).toBe("http://cdn.test/document.png"));
    expect(screen.getByAltText("Uploaded preview").className).toContain("max-h-48");

    rerender(<FileUpload purpose="document" value="" onChange={vi.fn()} disabled />);
    const disabledZone = screen.getByRole("button", { name: "Upload a document" });
    expect(disabledZone).toHaveAttribute("tabindex", "-1");
    fireEvent.drop(disabledZone, { dataTransfer: { files: [pdfFile()] } });
    expect(screen.queryByText(/Uploading/)).not.toBeInTheDocument();
  });

  it("shows an uploaded PDF as a document link, with disabled controls", () => {
    render(<FileUpload purpose="document" value="http://cdn.test/doc.pdf?sig=1" onChange={vi.fn()} disabled />);
    expect(screen.getByRole("link", { name: /Document uploaded/ })).toHaveAttribute("href", "http://cdn.test/doc.pdf?sig=1");
    expect(screen.getByRole("button", { name: /Replace/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Remove/ })).toBeDisabled();
  });

  it("finishes quietly when unmounted mid-upload", async () => {
    stubUploads();
    const { input, unmount, uploading } = renderUpload();
    await userEvent.upload(input, pngFile());
    await screen.findByText(/Uploading/);
    unmount();
    await waitFor(() => expect(uploading).toHaveBeenLastCalledWith(false));
  });
});

describe("form helpers", () => {
  it("shows string errors, hints and markers, and nothing for an empty alert", () => {
    const { container } = render(
      <>
        <Field id="a" label="A" error="Bad value" required>
          <input id="a" />
        </Field>
        <Field id="b" label="B" hint="A hint" optional>
          <input id="b" />
        </Field>
        <Field id="c" label="C">
          <input id="c" />
        </Field>
        <FormAlert message="" />
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Bad value");
    expect(screen.getByText("A hint")).toBeInTheDocument();
    expect(screen.getByText("(optional)")).toBeInTheDocument();
    expect(within(container).getAllByRole("alert")).toHaveLength(1);
  });
});
