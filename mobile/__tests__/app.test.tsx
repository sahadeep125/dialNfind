/// <reference types="jest" />
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";

import { useAuthStore } from "@/stores/useAuthStore";
import { apiGet, isApiUp, liveFetch } from "./helpers/liveApi";

// Renders the whole app through its Android code paths against the running API (pnpm dev).
// expo-router's testing library installs Reanimated's bare mock, which lacks useReducedMotion.
(require("react-native-reanimated") as Record<string, unknown>).useReducedMotion = () => false;
globalThis.fetch = liveFetch as typeof fetch;

jest.setTimeout(60000);

const apiUp = isApiUp();
const describeLive = apiUp ? describe : describe.skip;
if (!apiUp) console.warn("API is not running on :4000; skipping the app walkthrough.");

const find = (text: string | RegExp) =>
  waitFor(() => expect(screen.getAllByText(text)[0]).toBeOnTheScreen(), { timeout: 8000 });

async function launch(url = "/") {
  renderRouter("./src/app", { initialUrl: url });
  // Fonts load first, then the branded splash plays before the app shows.
  await find("Trusted local services, one call away");
  act(() => jest.advanceTimersByTime(1600));
}

afterEach(() => {
  act(() => useAuthStore.getState().signOut());
});

describeLive("DialNFind app on Android", () => {
  const featured = apiGet<{ results: { slug: string; businessName: string }[] }>(
    "/providers/featured?lat=26.7338&lng=88.4325&limit=10",
  ).results;
  const provider = featured[0];

  test("opens on the splash, then Home with categories and providers", async () => {
    renderRouter("./src/app", { initialUrl: "/" });
    await find("Trusted local services, one call away");
    act(() => jest.advanceTimersByTime(1600));
    await find("Find trusted help nearby");
    await find("Plumbing");
    await find(provider.businessName);
    expect(screen.queryByText("Trusted local services, one call away")).toBeNull();
  });

  test("guest taps the profile icon and signs in", async () => {
    await launch();
    await find("Find trusted help nearby");
    fireEvent.press(screen.getByLabelText("Sign in"));
    await find("Welcome back");
    fireEvent.press(screen.getAllByText("Sign in").at(-1)!);
    await find("Enter your email address");
    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "demo@dialnfind.com");
    fireEvent.changeText(screen.getByPlaceholderText("Your password"), "password123");
    fireEvent.press(screen.getAllByText("Sign in").at(-1)!);
    await waitFor(() => expect(useAuthStore.getState().token).toBeTruthy());
    await waitFor(() => expect(screen.getByLabelText("Your profile")).toBeOnTheScreen());
  });

  test("guest tabs ask to sign in", async () => {
    await launch("/favorites");
    await find("Save the pros you like");
    fireEvent.press(screen.getByText("My reviews"));
    await find("Share your experience");
    fireEvent.press(screen.getAllByText("Settings").at(-1)!);
    await find("Sign in or create an account");
    await find("Help centre");
  });

  test("search shows suggestions and results", async () => {
    await launch("/search");
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Service, category or business")).toBeOnTheScreen(),
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Service, category or business"),
      "electrician",
    );
    act(() => jest.advanceTimersByTime(400));
    await find('Search for "electrician"');
    fireEvent(screen.getByPlaceholderText("Service, category or business"), "submitEditing");
    await find(/providers? (found|within \d+ km of)/);
    await find("Open now");
  });

  test("category screen lists providers with subcategory chips", async () => {
    await launch("/category/electricians");
    await find(/providers? (found|within \d+ km of)/);
    await find("All");
  });

  test("provider profile shows details, hours and reviews", async () => {
    await launch(`/provider/${provider.slug}`);
    await find(provider.businessName);
    await find("Opening hours");
    await find("Reviews");
    await find("Call");
  });

  test("signed-in tabs, review form, profile and help", async () => {
    const login = JSON.parse(
      require("./helpers/liveApi").curl("http://localhost:4000/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "demo@dialnfind.com", password: "password123" }),
      }).body,
    ) as { token: string; user: Parameters<ReturnType<typeof useAuthStore.getState>["signIn"]>[1] };
    act(() => useAuthStore.getState().signIn(login.token, login.user));

    await launch("/favorites");
    await find(/saved provider/);
    fireEvent.press(screen.getByText("My reviews"));
    await find(/\d+ reviews?/);
    fireEvent.press(screen.getAllByText("Settings").at(-1)!);
    await find("Edit profile");
    await find("Delete account");
    act(() => router.push(`/review/${provider.slug}`));
    await find(/Post review|Update review/);
    act(() => router.push("/profile"));
    await find("Save changes");
    act(() => router.push("/help"));
    await find("Is DialNFind free to use?");
  });

  test("create account screen", async () => {
    await launch("/register");
    await find("Create your account");
    fireEvent.press(screen.getByText("Create account"));
    await find(
      "Enter a valid email address"
        .replace("a valid ", "your ")
        .replace("Enter your email address", "Enter your email address"),
    );
  });
});
