import { mapWebPath } from "@/utils/links";

describe("mapWebPath", () => {
  it.each([
    ["https://kaajva.in/providers/sharma-tv", "/provider/sharma-tv"],
    ["/providers/sharma-tv/", "/provider/sharma-tv"],
    ["https://kaajva.in/services", "/categories"],
    ["https://kaajva.in/services/electronics-repair?sub=tv-repair&lat=1", "/category/electronics-repair?sub=tv-repair"],
    ["https://kaajva.in/services/electronics-repair/tv-repair?lat=1", "/category/electronics-repair?sub=tv-repair"],
    ["https://kaajva.in/search?q=plumber&lat=1&lng=2", "/search?q=plumber"],
    ["https://kaajva.in/dashboard/support/42", "/support/42"],
    ["https://kaajva.in/dashboard/notifications", "/notifications"],
    ["https://kaajva.in/dashboard/contacts", "/contacts"],
  ])("maps %s to %s", (input, expected) => {
    expect(mapWebPath(input)).toBe(expected);
  });

  it("passes app paths through unchanged", () => {
    expect(mapWebPath("/provider/sharma-tv")).toBe("/provider/sharma-tv");
    expect(mapWebPath("kaajva:///review/abc")).toBe("/review/abc");
  });
});
