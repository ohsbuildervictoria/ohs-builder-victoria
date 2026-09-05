// ============================================================================
// Onboarding guidance UI — the Dashboard checklist card and the next-step
// strip, rendered against a fresh fictional organisation.
//
//   * the card never shows a false tick and counts only real progress;
//   * "Not yet" items are not links; actionable items link to the exact screen;
//   * the strip names the next ACTIONABLE step, and when that step is
//     completed it acknowledges it and moves to the following one;
//   * an invited HSE manager is "waiting", never "invite again", and never
//     blocks the pointer from reaching a later actionable item;
//   * "Hide for now" hides card and strip, leaves "Show setup guidance", and
//     the preference survives navigation until the builder restores it.
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

const at = (path, ui) => <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>;
const mount = (ui, path = "/builder/projects") => render(at(path, ui));
const stripLink = (strip) => within(strip).getAllByRole("link")[0];
// Everything before the HSE manager is done; org profile complete.
const profileDone = () => {
  ctx.value.org = { ...ctx.value.org, abn: "12345678901", billingContact: "accounts@marlowridge.example" };
};
const HSE_INVITE = { id: "invite-1", role: "hse_manager", name: "SiteIQ (assistant)" };

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

  test("an invited HSE manager reads as waiting, not as 'invite again' (unchanged)", async () => {
    ctx.value.invites = [HSE_INVITE];
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
  test("names the first actionable step and links to its screen", async () => {
    mount(<NextStepStrip />);
    const strip = await screen.findByTestId("next-step-strip");
    expect(stripLink(strip).textContent).toMatch(/Organisation profile/);
    expect(stripLink(strip).getAttribute("href")).toBe("/builder/policies?tab=Organisation");
    expect(within(strip).getByText(/1 of 11 set up/)).toBeTruthy();
  });

  test("an invited HSE manager is never offered as 'Invite an HSE manager'; the strip points past it", async () => {
    profileDone();
    ctx.value.invites = [HSE_INVITE];
    mount(<NextStepStrip />);
    const strip = await screen.findByTestId("next-step-strip");
    await waitFor(() => expect(within(strip).getByTestId("next-step-waiting")).toBeTruthy());
    // 1. not presented as the builder's next task
    expect(within(strip).queryByText(/Next:.*Invite an HSE manager/)).toBeNull();
    expect(within(strip).getByText("Next:").parentElement.textContent).not.toMatch(/Invite an HSE manager/);
    // 2. waiting state named clearly
    expect(within(strip).getByTestId("next-step-waiting").textContent).toMatch(/HSE manager invited/);
    // 3. the later actionable item is the next step
    const next = within(strip).getByText("Next:").parentElement.querySelector("a");
    expect(next.textContent).toMatch(/Create your first project/);
    expect(next.getAttribute("href")).toBe("/builder/projects?new=1");
  });

  test("when the only remaining item is waiting, the strip says so and links to the roster, with no 'Next'", async () => {
    // A fully configured organisation except the HSE manager, who is invited.
    ctx.value = {
      ...freshOrg(),
      org: { id: 16, name: "Marlow Ridge Constructions", abn: "12345678901", state: "VIC", billingContact: "a@b.example" },
      invites: [HSE_INVITE],
      projects: [{ id: 49, name: "Bayside Duplex", status: "Active", induction: { musterPoint: "gate", contactName: "Tessa" } }],
      policies: [{ id: 1, status: "Active", content: "Sign in at the gate." }],
      companies: [{ id: 301, name: "Harbour Formwork Pty Ltd" }],
      companyDocs: [{ companyId: 301, category: "publicLiability", filePath: "x.pdf", expiry: "2027-01-01" }],
      workers: [{ id: 1, trade: "Carpenter", trades: ["Carpenter"], companyId: 301 }],
      templates: [{ trade: "Carpenter", locked: true }],
      projectRisks: [{ projectId: 49 }],
      meetings: [{ date: "2099-01-01" }],
    };
    mount(<NextStepStrip />);
    const strip = await screen.findByTestId("next-step-strip");
    await waitFor(() => expect(within(strip).getByTestId("next-step-waiting")).toBeTruthy());
    expect(within(strip).queryByText("Next:")).toBeNull();
    expect(within(strip).getByText(/HSE manager invited/)).toBeTruthy();
    const waitingLink = within(strip).getByRole("link", { name: /Waiting for them to accept/ });
    expect(waitingLink.getAttribute("href")).toBe("/builder/admin");
    expect(within(strip).getByText(/10 of 11 set up/)).toBeTruthy();
  });

  test("done / open / in_progress still drive the pointer in order", async () => {
    profileDone();
    ctx.value.profiles.push({ role: "hse_manager", status: "Active" });
    ctx.value.projects = [{ id: 49, name: "Bayside Duplex", status: "Active", induction: { musterPoint: "gate", contactName: "Tessa" } }];
    ctx.value.policies = [{ id: 1, status: "Active", content: "", filePath: null }];   // published but empty
    mount(<NextStepStrip />);
    const strip = await screen.findByTestId("next-step-strip");
    await waitFor(() => expect(stripLink(strip).textContent).toMatch(/Publish at least one policy/));
    expect(within(strip).queryByTestId("next-step-waiting")).toBeNull();
  });

  test("acknowledges a completed step and moves on (Project created ✓ · Next: …), with an invited HSE manager present", async () => {
    profileDone();
    ctx.value.invites = [HSE_INVITE];             // waiting item sits before the project item
    const view = mount(<NextStepStrip />);
    let strip = await screen.findByTestId("next-step-strip");
    await waitFor(() => expect(within(strip).getByText("Next:").parentElement.textContent).toMatch(/Create your first project/));
    expect(within(strip).queryByText(/Project created/)).toBeNull();

    // The builder creates a project and sets it Active (AppContext updates).
    ctx.value = { ...ctx.value, projects: [{ id: 49, name: "Bayside Duplex", status: "Active", induction: {} }] };
    view.rerender(at("/builder/projects", <NextStepStrip />));

    strip = await screen.findByTestId("next-step-strip");
    await screen.findByText("Project created and Active ✓");
    const next = within(strip).getByText("Next:").parentElement.querySelector("a");
    expect(next.textContent).toMatch(/Induction: emergency muster point/);
    expect(next.getAttribute("href")).toBe("/builder/projects/49?tab=Induction");
    // the waiting item is still named, still not a task
    expect(within(strip).getByTestId("next-step-waiting").textContent).toMatch(/HSE manager invited/);
  });

  test("the quiz bank finishing its read (unknown → done) is not acknowledged as a builder action", async () => {
    // Everything done except the HSE manager (invited); the quiz bank is the
    // last thing to resolve, from "couldn't check" to done, on first load.
    ctx.value = {
      ...freshOrg(),
      org: { id: 16, name: "Marlow Ridge Constructions", abn: "12345678901", state: "VIC", billingContact: "a@b.example" },
      invites: [HSE_INVITE],
      projects: [{ id: 49, name: "Bayside Duplex", status: "Active", induction: { musterPoint: "gate", contactName: "Tessa" } }],
      policies: [{ id: 1, status: "Active", content: "Sign in at the gate." }],
      workers: [{ id: 1, trade: "Carpenter", trades: ["Carpenter"], companyId: null }],
      templates: [{ trade: "Carpenter", locked: true }],
      projectRisks: [{ projectId: 49 }],
      meetings: [{ date: "2099-01-01" }],
    };
    mount(<NextStepStrip />);
    const strip = await screen.findByTestId("next-step-strip");
    // 9 of 11: the HSE manager is waiting and company insurance is not applicable.
    await waitFor(() => expect(within(strip).getByText(/9 of 11 set up/)).toBeTruthy());
    expect(within(strip).queryByText(/Safety quiz ready/)).toBeNull();
    expect(within(strip).queryByText("Next:")).toBeNull();
  });

  test("is not shown on the Dashboard (the card is)", async () => {
    mount(<NextStepStrip />, "/builder/dashboard");
    await waitFor(() => expect(screen.queryByTestId("next-step-strip")).toBeNull());
    expect(screen.queryByTestId("next-step-strip-hidden")).toBeNull();
  });
});

describe("Hide for now / Show setup guidance", () => {
  test("hiding removes card and strip and leaves a restore control on both", async () => {
    mount(<><ReadinessCard /><NextStepStrip /></>, "/builder/projects");
    await screen.findByTestId("next-step-strip");
    fireEvent.click(screen.getByRole("button", { name: "Hide for now" }));

    await waitFor(() => expect(screen.queryByTestId("next-step-strip")).toBeNull());
    expect(screen.queryByText("Getting your site ready")).toBeNull();
    expect(localStorage.getItem("ohsb.readiness.hidden")).toBe("1");
    // 2. restore control available while hidden (card side and strip side)
    expect(screen.getAllByRole("button", { name: "Show setup guidance" })).toHaveLength(2);
  });

  test("the hidden state persists across navigation and the strip offers the restore control on every page", async () => {
    localStorage.setItem("ohsb.readiness.hidden", "1");
    const view = mount(<NextStepStrip />, "/builder/projects");
    await screen.findByTestId("next-step-strip-hidden");
    expect(screen.queryByTestId("next-step-strip")).toBeNull();
    view.rerender(at("/builder/compliance", <NextStepStrip />));
    await screen.findByTestId("next-step-strip-hidden");
    expect(screen.queryByTestId("next-step-strip")).toBeNull();
    expect(screen.getByRole("button", { name: "Show setup guidance" })).toBeTruthy();
  });

  test("restoring brings the guidance back and clears the preference", async () => {
    localStorage.setItem("ohsb.readiness.hidden", "1");
    mount(<><ReadinessCard /><NextStepStrip /></>, "/builder/projects");
    await screen.findByTestId("next-step-strip-hidden");
    fireEvent.click(screen.getAllByRole("button", { name: "Show setup guidance" })[0]);

    await screen.findByTestId("next-step-strip");
    await screen.findByText("Getting your site ready");
    expect(localStorage.getItem("ohsb.readiness.hidden")).toBeNull();
    expect(screen.queryByRole("button", { name: "Show setup guidance" })).toBeNull();
    // readiness itself is unchanged by hiding/restoring
    await screen.findByText(/1 of 11 set up · 5 not yet applicable/);
  });

  test("nothing is shown at all once the checklist is complete, hidden or not", async () => {
    ctx.value = {
      ...freshOrg(),
      org: { id: 16, name: "Marlow Ridge Constructions", abn: "12345678901", state: "VIC", billingContact: "a@b.example" },
      profiles: [{ role: "builder_admin", status: "Active" }, { role: "hse_manager", status: "Active" }],
      projects: [{ id: 49, name: "Bayside Duplex", status: "Active", induction: { musterPoint: "gate", contactName: "Tessa" } }],
      policies: [{ id: 1, status: "Active", content: "Sign in at the gate." }],
      workers: [{ id: 1, trade: "Carpenter", trades: ["Carpenter"], companyId: null }],
      templates: [{ trade: "Carpenter", locked: true }],
      projectRisks: [{ projectId: 49 }],
      meetings: [{ date: "2099-01-01" }],
    };
    localStorage.setItem("ohsb.readiness.hidden", "1");
    mount(<><ReadinessCard /><NextStepStrip /></>, "/builder/projects");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Show setup guidance" })).toBeNull());
    expect(screen.queryByTestId("next-step-strip")).toBeNull();
    expect(screen.queryByText("Getting your site ready")).toBeNull();
  });
});
