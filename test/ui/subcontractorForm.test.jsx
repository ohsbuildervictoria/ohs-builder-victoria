// ============================================================================
// Regression: the Add/Edit Subcontractor form must never carry one company's
// values into the next open (onboarding rehearsal 5b saved
// "Harbour Formwork Pty LtdCoastline Electrical Pty Ltd" with two ABNs
// joined together because the second Add reopened with the first company's
// state still in the form).
//
//   npm run test:ui
// ============================================================================
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";

const HARBOUR = {
  id: 1,
  name: "Harbour Formwork Pty Ltd",
  abn: "11111111111",
  contactName: "Sam Rivers",
  contactPhone: "0400 000 001",
  contactEmail: "sam@harbourformwork.example",
};

// Mutable per-test store the mocked hooks read from.
const store = { companies: [], addCompany: vi.fn(), updateCompany: vi.fn() };

vi.mock("../../src/hooks/useCompanies", () => ({
  useCompanies: () => ({
    companies: store.companies,
    getCompany: (id) => store.companies.find((c) => c.id === Number(id)) || null,
    docsFor: () => ({}),
    workersOf: () => [],
    addCompany: store.addCompany,
    updateCompany: store.updateCompany,
    removeCompany: vi.fn(),
    uploadDoc: vi.fn(),
    removeDoc: vi.fn(),
    open: vi.fn(),
  }),
}));
vi.mock("../../src/hooks/useDocuments", () => ({
  useDocuments: () => ({ docsFor: () => ({}) }),
}));
vi.mock("../../src/components/ui/Notification", () => ({
  useToast: () => () => {},
}));

import SubbiePanel from "../../src/pages/builder/Subcontractors";

const dialog = () => screen.getByRole("dialog");
const field = (label) => within(dialog()).getByLabelText(label);
const typeInto = (label, value) => fireEvent.change(field(label), { target: { value } });
const noDialog = () => waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

beforeEach(() => {
  store.companies = [];
  store.addCompany = vi.fn(async (data) => ({ id: 99, ...data }));
  store.updateCompany = vi.fn(async (id, patch) => ({ id, ...patch }));
});
afterEach(cleanup);

describe("Subcontractor form state", () => {
  test("Add -> save -> Add again starts blank (rehearsal 5b)", async () => {
    const view = render(<SubbiePanel addCompanySignal={0} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add your first subcontractor" }));

    typeInto("Business name *", HARBOUR.name);
    typeInto("ABN", HARBOUR.abn);
    fireEvent.click(within(dialog()).getByRole("button", { name: "Add Subcontractor" }));
    await noDialog();
    expect(store.addCompany).toHaveBeenCalledTimes(1);
    expect(store.addCompany.mock.calls[0][0]).toMatchObject({ name: HARBOUR.name, abn: HARBOUR.abn });

    // The company now exists; the header's "+ Add Subcontractor" raises the signal.
    store.companies = [HARBOUR];
    view.rerender(<SubbiePanel addCompanySignal={1} />);

    expect(field("Business name *").value).toBe("");
    expect(field("ABN").value).toBe("");

    typeInto("Business name *", "Coastline Electrical Pty Ltd");
    typeInto("ABN", "22222222222");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Add Subcontractor" }));
    await noDialog();
    expect(store.addCompany.mock.calls[1][0]).toMatchObject({
      name: "Coastline Electrical Pty Ltd",
      abn: "22222222222",
    });
  });

  test("Add typed then cancelled does not leak into the next Add", async () => {
    const view = render(<SubbiePanel addCompanySignal={0} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add your first subcontractor" }));
    typeInto("Business name *", "Half-typed Pty Ltd");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    await noDialog();

    view.rerender(<SubbiePanel addCompanySignal={1} />);
    expect(field("Business name *").value).toBe("");
    expect(store.addCompany).not.toHaveBeenCalled();
  });

  test("Edit loads only the selected company's values and still saves", async () => {
    store.companies = [HARBOUR];
    render(<SubbiePanel addCompanySignal={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(field("Business name *").value).toBe(HARBOUR.name);
    expect(field("ABN").value).toBe(HARBOUR.abn);
    expect(field("Contact person").value).toBe(HARBOUR.contactName);
    expect(field("Contact email").value).toBe(HARBOUR.contactEmail);

    typeInto("Contact phone", "0400 000 002");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save changes" }));
    await noDialog();
    expect(store.updateCompany).toHaveBeenCalledTimes(1);
    expect(store.updateCompany.mock.calls[0][0]).toBe(HARBOUR.id);
    expect(store.updateCompany.mock.calls[0][1]).toMatchObject({
      name: HARBOUR.name,
      abn: HARBOUR.abn,
      contactPhone: "0400 000 002",
    });
  });

  test("Edit -> cancel -> Add opens blank, never with the edited company's values", async () => {
    store.companies = [HARBOUR];
    const view = render(<SubbiePanel addCompanySignal={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(field("Business name *").value).toBe(HARBOUR.name);
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    await noDialog();

    view.rerender(<SubbiePanel addCompanySignal={1} />);
    expect(within(dialog()).getByText("Add Subcontractor", { selector: "h3" })).toBeTruthy();
    expect(field("Business name *").value).toBe("");
    expect(field("ABN").value).toBe("");
    expect(field("Contact person").value).toBe("");
  });

  test("Edit -> type -> cancel -> Edit again shows the saved values, not the abandoned typing", async () => {
    store.companies = [HARBOUR];
    render(<SubbiePanel addCompanySignal={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    typeInto("Business name *", "Abandoned rename");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    await noDialog();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(field("Business name *").value).toBe(HARBOUR.name);
    expect(store.updateCompany).not.toHaveBeenCalled();
  });
});
