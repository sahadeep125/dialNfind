/// <reference types="jest" />
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";

import { useAuthStore } from "@/stores/useAuthStore";
import type { SessionUser } from "@/types";
import { curl, isApiUp, liveFetch } from "./helpers/liveApi";

// Renders the whole provider app through its Android code paths against the running API (pnpm dev).
// expo-router's testing library installs Reanimated's bare mock, which lacks useReducedMotion.
(require("react-native-reanimated") as Record<string, unknown>).useReducedMotion = () => false;
globalThis.fetch = liveFetch as typeof fetch;

jest.setTimeout(90000);

const API = "http://localhost:4000/api/v1";
const apiUp = isApiUp();
const describeLive = apiUp ? describe : describe.skip;
if (!apiUp) console.warn("API is not running on :4000; skipping the app walkthrough.");

const find = (text: string | RegExp) =>
  waitFor(() => expect(screen.getAllByText(text)[0]).toBeOnTheScreen(), { timeout: 8000 });

function login(email: string): { token: string; user: SessionUser } {
  return JSON.parse(
    curl(`${API}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    }).body,
  ) as { token: string; user: SessionUser };
}

async function launch(url = "/") {
  renderRouter("./src/app", { initialUrl: url });
  // Fonts load first, then the branded splash plays before the app shows.
  await find("Run your business, win more customers");
  act(() => jest.advanceTimersByTime(1600));
}

function signInAs(email: string): SessionUser {
  const session = login(email);
  act(() => useAuthStore.getState().signIn(session.token, session.user));
  return session.user;
}

afterEach(() => {
  act(() => useAuthStore.getState().signOut());
});

describeLive("DialNFind Business on Android", () => {
  const owner = login("provider@dialnfind.com");
  const business = (
    JSON.parse(
      curl(`${API}/provider/me`, { headers: { authorization: `Bearer ${owner.token}` } }).body,
    ) as { provider: { businessName: string } }
  ).provider.businessName;

  test("signed-out launch shows log in, and logging in opens the dashboard", async () => {
    await launch();
    await find("Log in to your business");
    fireEvent.changeText(screen.getByPlaceholderText("you@business.com"), "provider@dialnfind.com");
    fireEvent.changeText(screen.getByPlaceholderText("Your password"), "password123");
    fireEvent.press(screen.getAllByText("Log in").at(-1)!);
    await waitFor(() => expect(useAuthStore.getState().token).toBeTruthy());
    await find(business);
    await find("Profile strength");
  });

  test("tabs show leads, reviews and more", async () => {
    signInAs("provider@dialnfind.com");
    await launch();
    await find(business);
    fireEvent.press(screen.getAllByText("Leads").at(-1)!);
    await find("All");
    fireEvent.press(screen.getAllByText("Reviews").at(-1)!);
    await find("Needs a reply");
    fireEvent.press(screen.getAllByText("More").at(-1)!);
    await find("Edit profile");
    await find("Plan and billing");
    await find("Sign out");
  });

  test.each([
    ["/profile", "Save changes"],
    ["/services", "Services and prices"],
    ["/hours", "Working hours"],
    ["/areas", "Service areas"],
    ["/portfolio", "Photos"],
    ["/verification", "Verification"],
    ["/promote", "Promote"],
    ["/subscription", "Plan and billing"],
    ["/support", "Support"],
    ["/notifications", "Notifications"],
    ["/help", "Help and FAQ"],
    ["/legal/terms", "Terms"],
  ])("%s renders", async (path, text) => {
    signInAs("provider@dialnfind.com");
    await launch();
    await find(business);
    act(() => router.push(path as never));
    await find(text);
    expect(screen.queryByText("Could not load this")).toBeNull();
  });

  test("an account without a business goes to setup, then onboarding and claim", async () => {
    signInAs("newprovider@dialnfind.com");
    await launch();
    await find(/Let us get you listed/);
    fireEvent.press(screen.getByText("Add a new business"));
    await find("Tell us about your business");
    act(() => router.back());
    await find(/Let us get you listed/);
    fireEvent.press(screen.getByText("Claim my existing listing"));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. Sharma TV Care")).toBeOnTheScreen(),
    );
  });

  test("create account screen", async () => {
    await launch("/register");
    await find("Create account");
  });
});
