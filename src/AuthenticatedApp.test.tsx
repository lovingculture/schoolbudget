import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const profileMaybeSingle = vi.fn();
  const profileEq = vi.fn(() => ({ maybeSingle: profileMaybeSingle }));
  const profileSelect = vi.fn(() => ({ eq: profileEq }));
  const schoolSingle = vi.fn();
  const schoolEq = vi.fn(() => ({ single: schoolSingle }));
  const schoolSelect = vi.fn(() => ({ eq: schoolEq }));
  const from = vi.fn((table: string) =>
    table === "profiles" ? { select: profileSelect } : { select: schoolSelect },
  );
  const unsubscribe = vi.fn();

  return {
    from,
    profileEq,
    profileMaybeSingle,
    profileSelect,
    schoolEq,
    schoolSingle,
    schoolSelect,
    supabase: {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
        signOut: vi.fn(),
      },
      from,
    },
  };
});

vi.mock("./lib/supabase", () => ({ supabase: mocks.supabase }));

vi.mock("./features/resources/BudgetResourceLibraryPage", () => ({
  BudgetResourceLibraryPage: ({ isAdmin, userId }: { isAdmin: boolean; userId: string }) => (
    <output aria-label="resource access context">{`${isAdmin}:${userId}`}</output>
  ),
}));

import { AuthenticatedApp } from "./App";

afterEach(() => {
  vi.clearAllMocks();
});

describe("AuthenticatedApp", () => {
  it("loads the profile admin flag and forwards the authenticated user ID to the resource library", async () => {
    mocks.supabase.auth.getSession.mockResolvedValue({
      data: {
        session: { user: { id: "authenticated-user-id", user_metadata: {} } },
      },
    });
    mocks.profileMaybeSingle.mockResolvedValue({
      data: { school_id: "school-id", display_name: "김관리", is_admin: true },
      error: null,
    });
    mocks.schoolSingle.mockResolvedValue({
      data: { name: "서울한빛초등학교" },
      error: null,
    });
    const user = userEvent.setup();

    render(<AuthenticatedApp />);

    await user.click(await screen.findByRole("button", { name: "예산 자료실" }));

    expect(screen.getByRole("status", { name: "resource access context" })).toHaveTextContent(
      "true:authenticated-user-id",
    );
    expect(mocks.profileSelect).toHaveBeenCalledWith(
      "school_id, display_name, is_admin",
    );
    expect(mocks.profileEq).toHaveBeenCalledWith("user_id", "authenticated-user-id");
  });
});
