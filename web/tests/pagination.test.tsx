// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Pagination, hrefFor, visiblePages } from "@/components/pagination";

afterEach(cleanup);

describe("visiblePages", () => {
  it("shows the ends and the neighbours of the current page", () => {
    expect(visiblePages(5, 10)).toEqual([1, 4, 5, 6, 10]);
    expect(visiblePages(1, 2)).toEqual([1, 2]);
  });
});

describe("hrefFor", () => {
  it("keeps other params and drops page 1", () => {
    expect(hrefFor("/search", { q: "tv", page: "3" }, { page: null })).toBe("/search?q=tv");
  });
});

describe("Pagination", () => {
  it("renders nothing for a single page", () => {
    const { container } = render(<Pagination page={1} totalPages={1} searchParams={{}} basePath="/x" />);
    expect(container.innerHTML).toBe("");
  });
  it("marks the current page and has no link before page 1", () => {
    render(<Pagination page={1} totalPages={3} searchParams={{ q: "tv" }} basePath="/search" />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Page 1" }).getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("link", { name: "Previous page" })).toBeNull();
    expect(screen.getByRole("link", { name: "Next page" }).getAttribute("href")).toBe("/search?q=tv&page=2");
  });
  it("has no Next link on the last page", () => {
    render(<Pagination page={3} totalPages={3} searchParams={{}} basePath="/x" />);
    expect(screen.queryByRole("link", { name: "Next page" })).toBeNull();
    expect(screen.getByRole("link", { name: "Previous page" }).getAttribute("href")).toBe("/x?page=2");
  });
});
