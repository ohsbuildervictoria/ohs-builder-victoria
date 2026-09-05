// ============================================================================
// Pilot access flow — a builder invited as staff opens /join-staff/<token>,
// sees which organisation and role they were invited to, creates their OWN
// password (never handled by anyone else), and lands in the builder
// workspace. This is the supported way to give a pilot user access without
// creating an account or a password on their behalf.
//
//   npm run test:ui
// ============================================================================
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const auth = { user: null, joinAsStaff: vi.fn() };
const api = { info: null };
vi.mock("../../src/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("../../src/lib/api", () => ({ fetchStaffInviteInfo: vi.fn(async () => api.info) }));
vi.mock("../../src/components/shared/Logo", () => ({ default: () => null }));

import JoinStaff from "../../src/pages/JoinStaff";

const INVITE = { name: "Pilot Builder (test)", email: "pilot.builder.test@example.invalid",
                 role: "builder_admin", orgName: "Marlow Ridge Constructions Pty Ltd", claimed: false };

function mount(token = "tok-fictional-123") {
  return render(
    <MemoryRouter initialEntries={[`/join-staff/${token}`]}>
      <Routes>
        <Route path="/join-staff/:token" element={<JoinStaff />} />
        <Route path="/builder/dashboard" element={<h1>Builder dashboard</h1>} />
        <Route path="/login" element={<h1>Login page</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  auth.user = null;
  auth.joinAsStaff = vi.fn(async () => ({ role: "builder_admin" }));
  api.info = { ...INVITE };
});
afterEach(cleanup);

describe("Staff invite join page (pilot access)", () => {
  test("shows the organisation and role, binds the email, and asks the invitee to create a password", async () => {
    mount();
    await screen.findByText("Marlow Ridge Constructions Pty Ltd");
    expect(screen.getByText("Builder Admin")).toBeTruthy();
    expect(screen.getByLabelText("Your email").value).toBe(INVITE.email);
    expect(screen.getByLabelText("Your email").readOnly).toBe(true);
    expect(screen.getByLabelText("Create a password").getAttribute("autocomplete")).toBe("new-password");
    expect(screen.getByRole("button", { name: "Set up & continue" })).toBeTruthy();
  });

  test("a short password is refused client-side; nothing is submitted", async () => {
    mount();
    await screen.findByText("Builder Admin");
    fireEvent.change(screen.getByLabelText("Create a password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Set up & continue" }));
    await screen.findByText("Use at least 8 characters");
    expect(auth.joinAsStaff).not.toHaveBeenCalled();
  });

  test("with a password of their own the invitee is set up with the invite's email and lands on the builder dashboard", async () => {
    mount();
    await screen.findByText("Builder Admin");
    fireEvent.change(screen.getByLabelText("Create a password"), { target: { value: "a-password-the-user-chose" } });
    fireEvent.click(screen.getByRole("button", { name: "Set up & continue" }));
    await screen.findByText("Builder dashboard");
    expect(auth.joinAsStaff).toHaveBeenCalledTimes(1);
    const call = auth.joinAsStaff.mock.calls[0][0];
    expect(call).toMatchObject({ token: "tok-fictional-123", email: INVITE.email, mode: "signup" });
    expect(call.password).toBe("a-password-the-user-chose");
  });

  test("an email that already has an account is switched to sign-in mode instead of failing", async () => {
    auth.joinAsStaff = vi.fn(async () => { throw new Error("ALREADY_REGISTERED"); });
    mount();
    await screen.findByText("Builder Admin");
    fireEvent.change(screen.getByLabelText("Create a password"), { target: { value: "a-password-the-user-chose" } });
    fireEvent.click(screen.getByRole("button", { name: "Set up & continue" }));
    await screen.findByText(/already has an account/);
    expect(screen.getByRole("button", { name: "Sign in & accept invite" })).toBeTruthy();
    expect(screen.getByLabelText("Your password").getAttribute("autocomplete")).toBe("current-password");
  });

  test("a used invite says so and points to sign-in; an invalid token says invite not found", async () => {
    api.info = { ...INVITE, claimed: true };
    mount();
    await screen.findByText("Already set up");
    cleanup();
    api.info = null;
    mount("tok-bad");
    await screen.findByText("Invite not found");
  });

  test("someone already signed in as staff is sent straight to the builder dashboard", async () => {
    auth.user = { role: "builder_admin", name: "Tessa Marlow" };
    mount();
    await screen.findByText("Builder dashboard");
  });
});
