import { mapWebPath } from "@/utils/links";

describe("mapWebPath", () => {
  it.each([
    ["https://dialnfind.com/providers/sharma-tv", "/provider/sharma-tv"],
    ["/providers/sharma-tv/", "/provider/sharma-tv"],
    ["https://dialnfind.com/services", "/categories"],
    ["https://dialnfind.com/services/electronics-repair?sub=tv-repair&lat=1", "/category/electronics-repair?sub=tv-repair"],
    ["https://dialnfind.com/search?q=plumber&lat=1&lng=2", "/search?q=plumber"],
    ["https://dialnfind.com/dashboard/support/42", "/support/42"],
    ["https://dialnfind.com/dashboard/notifications", "/notifications"],
    ["https://dialnfind.com/dashboard/contacts", "/contacts"],
  ])("maps %s to %s", (input, expected) => {
    expect(mapWebPath(input)).toBe(expected);
  });

  it("passes app paths through unchanged", () => {
    expect(mapWebPath("/provider/sharma-tv")).toBe("/provider/sharma-tv");
    expect(mapWebPath("dialnfind:///review/abc")).toBe("/review/abc");
  });
});
