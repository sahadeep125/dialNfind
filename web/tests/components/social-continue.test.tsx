// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { nav } from "../next-state";

// Stands in for Google/Apple: one button that reports a finished sign-in.
vi.mock("@/components/auth/social-buttons", () => ({
  SocialButtons: ({ onSignedIn }: { onSignedIn: (r: { isNewUser: boolean }) => void }) => (
    <button type="button" onClick={() => onSignedIn({ isNewUser: false })}>
      Social
    </button>
  ),
}));

describe("forms after a Google or Apple sign-in", () => {
  it.each([["login", LoginForm], ["register", RegisterForm]] as const)("%s continues to the next page", (_name, Form) => {
    nav.search = "next=/claim";
    render(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Social" }));
    expect(nav.router.push).toHaveBeenCalledWith("/claim");
    expect(nav.router.refresh).toHaveBeenCalled();
  });
});
