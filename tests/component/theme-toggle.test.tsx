// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function mockMatchMedia(prefersLight: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: prefersLight && query.includes("light"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("ThemeToggle", () => {
  // The toggle keeps an in-memory fallback at module level; load a fresh copy per test.
  let ThemeToggle: typeof import("@/components/layout/theme-toggle").ThemeToggle;

  beforeEach(async () => {
    vi.resetModules();
    ({ ThemeToggle } = await import("@/components/layout/theme-toggle"));
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    mockMatchMedia(false);
  });

  it("describes the current state and the action in its accessible name", () => {
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: "System theme. Switch to dark theme" }),
    ).toBeInTheDocument();
  });

  it("cycles preferences, persists them and applies the resolved theme", async () => {
    const user = userEvent.setup();
    mockMatchMedia(true);
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(button).toHaveAccessibleName("Dark theme. Switch to light theme");

    await user.click(button);
    expect(document.documentElement.dataset.theme).toBe("light");

    await user.click(button);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    // "system" resolves through the OS preference, mocked as light.
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("is keyboard operable", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("keeps working when storage is blocked", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button"));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
