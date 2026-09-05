// ============================================================================
// Onboarding guidance UI — the Dashboard checklist card and the next-step
// strip, rendered against a fresh fictional organisation.
//
//   * the card never shows a false tick and counts only real progress;
//   * "Not yet" items are not links; actionable items link to the exact screen;
//   * the strip names the next unfinished step, and when that step is
//     completed it acknowledges it and moves to the following one;
//   * hiding the card also hides the strip.
//
//   npm run test:ui
// ============================================================================
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mutable AppContext the mocked hook reads from (a fresh organisation).
const ctx = {};
function freshOrg() {
  return {
    org: { id: 16, name: "Marlow Ridge Constructions", abn: "", state: "VIC", billingContact: "" },
    profiles: [{ role: "builder_admin", status: "Active" }],
    invites: [],
    projects: [],
    policies: [],
    companies: [],
    companyDocs: [],
    workers: [],
    templates: [],
    projectRisks: [],
    meetings: [],
    loading: false,
  };
}
vi.mock("../../src/context/AppContext", () => ({ useAppContext: () => ctx.value }));
vi.mock("../../src/lib/api", () => ({ fetchQuizBank: vi.fn(async () => [{ id: 1, active: true }]) }));

import ReadinessCard from "../../src/components/builder/ReadinessCard";
import NextStepStrip from "../../src/components/builder/NextStepStrip";

const mount = (ui, path = "/builder/projects") => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

beforeEach(() => {
  ctx.value = freshOrg();
  try { localStorage.clear(); } catch { /* ignore */ }
});
afterEach(cleanup);

describe("Readiness card (Dashboard)", () => {
  test("a fresh organisation: one real tick (seeded quiz), five 'Not yet', honest count", async () => {
    mount(<ReadinessCard />, "/builder/dashboard");
    await screen.findByText(/1 of 11 set up · 5 not yet applicable/);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(11);
    expect(items.filter((li) => li.dataset.state === "done")).toHaveLength(1);
    expect(items.filter((li) => li.dataset.state === "not_applicable")).toHaveLength(5);
    expect(screen.getAllByText("Done ✓")).toHaveLength(1);
    expect(screen.getAllByText("Not yet")).toHaveLength(5);
    // "Not yet" rows are not links; the next open item is, and points at its exact screen
    const notYet = items.find((li) => li.dataset.state === "not_applicable");
    expect(within(notYet).queryByRole("link")).toBeNull();
    const first = items[0];
    expect(within(first).getByRole("link").getAttribute("href")).toBe("/builder/policies?tab=Organisation");
    expect(within(items[1]).getByRole("link").getAttribute("href")).toBe("/builder/admin?invite=1");
    expect(within(items[2]).getByRole("link").getAttribute("href")).toBe("/builder/projects?new=1");
  });

  test("an invited HSE manager reads as waiting, not as 'invite again'", async () => {
    ctx.value.invites = [{ id: "invite-1", role: "hse_manager", name: "SiteIQ (assistant)" }];
    mount(<ReadinessCard />, "/builder/dashboard");
    await screen.findByText("Invited · waiting →");
    const li = screen.getAllByRole("listitem")[1];
    expect(li.dataset.state).toBe("invited");
    expect(within(li).getByRole("link").getAttribute("href")).toBe("/builder/admin");
    expect(within(li).getByText(/waiting for them to accept/)).toBeTruthy();
  });

  test("a published but empty policy is 'In progress', never a tick", async () => {
    ctx.value.policies = [{ id: 1, name: "Site rules", status: "Active", content: null, filePath: null }];
    mount(<ReadinessCard />, "/builder/dashboard");
    await screen.findByText("In progress →");
    const li = screen.getAllByRole("listitem")[5];
    expect(li.dataset.state).toBe("in_progress");
    expect(within(li).getByText(/add the policy text or attach a PDF/)).toBeTruthy();
  });
});

describe("Next-step strip (every builder page)", () => {
  test("names the first unfinished step and links to its screen", async () => {
    mount(<NextStepStrip />);
    const strip = await screen.findByTestId("next-step-strip");
    const link = within(strip).getAllByRole("link")[0];
    expect(link.textContent).toMatch(/Organisation profile/);
    expect(link.getAttribute("href")).toBe("/builder/policies?tab=Organisation");
    expect(within(strip).getByText(/1 of 11 set up/)).toBeTruthy();
  });

  test("acknowledges a completed step and moves to the next one (Project created ✓ · Next: …)", async () => {
    // Everything before the project is done; the project is the next step.
    ctx.value.org = { ...ctx.value.org, abn: "12345678901", billingContact: "accounts@marlowridge.example" };
    ctx.value.profiles.push({ role: "hse_manager", status: "Active" });
    const view = mount(<NextStepStrip />);
    let strip = await screen.findByTestId("next-step-strip");
    await waitFor(() => expect(within(strip).getAllByRole("link")[0].textContent).toMatch(/Create your first project/));
    expect(within(strip).queryByText(/✓/)).toBeNull();

    // The builder creates a project and sets it Active (AppContext updates).
    ctx.value = { ...ctx.value, projects: [{ id: 49, name: "Bayside Duplex", status: "Active", induction: {} }] };
    view.rerender(<MemoryRouter initialEntries={["/builder/projects"]}><NextStepStrip /></MemoryRouter>);

    strip = await screen.findByTestId("next-step-strip");
    await screen.findByText("Project created and Active ✓");
    const next = within(strip).getAllByRole("link")[0];
    expect(next.textContent).toMatch(/Induction: emergency muster point/);
    expect(next.getAttribute("href")).toBe("/builder/projects/49?tab=Induction");
  });

  test("is not shown on the Dashboard (the card is), and disappears when the checklist is hidden", async () => {
    mount(<NextStepStrip />, "/builder/dashboard");
    await waitFor(() => expect(screen.queryByTestId("next-step-strip")).toBeNull());
    cleanup();

    mount(<><ReadinessCard /><NextStepStrip /></>, "/builder/projects");
    await screen.findByTestId("next-step-strip");
    fireEvent.click(screen.getByRole("button", { name: "Hide for now" }));
    await waitFor(() => expect(screen.queryByTestId("next-step-strip")).toBeNull());
    expect(screen.queryByText("Getting your site ready")).toBeNull();
  });
});
