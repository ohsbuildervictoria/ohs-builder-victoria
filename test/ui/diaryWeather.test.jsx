// ============================================================================
// Regression: the Site Diary's asynchronous weather auto-fill (Open-Meteo)
// must never replace what the builder has already typed. Onboarding rehearsal
// 7b: the entry form lost its typed values when the weather result arrived
// ~2 s after the page loaded.
//
//   1. diary loads (weather request in flight)
//   2. user enters information
//   3. weather request resolves
//   4. manually entered information is unchanged
//
//   npm run test:ui
// ============================================================================
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";

const PROJECT = { id: 1, name: "Marlow Ridge Stage 1", address: "12 Harbour Street, Geelong VIC 3220", status: "Active" };
const WEATHER = { summary: "22°C · Partly cloudy", wind: "18 km/h", place: "Geelong" };

// One controllable pending weather lookup per test.
const weather = { resolve: null, calls: 0 };
vi.mock("../../src/lib/weather", () => ({
  fetchWeatherFor: vi.fn(
    () =>
      new Promise((res) => {
        weather.calls += 1;
        weather.resolve = res;
      })
  ),
}));

const diary = { addEntry: vi.fn(), editEntry: vi.fn() };
vi.mock("../../src/hooks/useDiary", () => ({
  useDiary: () => ({ entries: [], addEntry: diary.addEntry, editEntry: diary.editEntry, getByProject: () => [], getByDate: () => [] }),
}));
vi.mock("../../src/hooks/useProjects", () => ({ useProjects: () => ({ projects: [PROJECT] }) }));
vi.mock("../../src/hooks/useAuth", () => ({ useAuth: () => ({ user: { name: "Test Builder" } }) }));
vi.mock("../../src/hooks/usePhotos", () => ({ usePhotos: () => ({ addPhotos: vi.fn(async () => ({ saved: 0, failed: 0 })) }) }));
vi.mock("../../src/context/AppContext", () => ({
  useAppContext: () => ({ org: { name: "Marlow Ridge Constructions" }, checkins: [], setEntries: vi.fn() }),
}));
vi.mock("../../src/components/ui/Notification", () => ({ useToast: () => () => {} }));
vi.mock("../../src/lib/pdf", () => ({ exportDiaryRange: vi.fn() }));
vi.mock("../../src/lib/api", () => ({ uploadDiaryAudio: vi.fn(), getDiaryAudioUrl: vi.fn() }));
vi.mock("../../src/components/shared/RecordPhotos", () => ({ PhotoPicker: () => null, PhotoStrip: () => null }));
vi.mock("../../src/components/shared/AuditTrail", () => ({ default: () => null }));

import SiteDiary from "../../src/pages/builder/SiteDiary";

// The weather note renders inside the Weather label, so match on the label heading only.
const field = (label) => screen.getByLabelText((text) => text.startsWith(label));
const typeInto = (label, value) => fireEvent.change(field(label), { target: { value } });
const resolveWeather = async (result) => {
  await act(async () => {
    weather.resolve(result);
  });
};

beforeEach(() => {
  weather.resolve = null;
  weather.calls = 0;
  diary.addEntry = vi.fn(async (entry) => ({ id: 501, ...entry }));
});
afterEach(cleanup);

describe("Site Diary weather auto-fill vs typed values", () => {
  test("weather arriving after the user typed leaves every typed field intact", async () => {
    render(<SiteDiary />);
    await waitFor(() => expect(weather.calls).toBeGreaterThan(0));

    // 2. user enters information while the lookup is still in flight
    typeInto("Hours worked on site", "6");
    typeInto("Stakeholders present", "4");
    typeInto("Meeting contacts", "Sam Rivers (Harbour Formwork)");
    typeInto("Deliveries received", "Formwork ply x40");
    typeInto("Notes / observations", "Perimeter fencing checked at 4pm.");
    fireEvent.click(screen.getByRole("button", { name: "Delivery" }));

    // 3. weather request resolves
    await resolveWeather(WEATHER);
    await screen.findByText(/Auto-filled for Geelong/);

    // 4. manually entered information remains unchanged; weather fields filled
    expect(field("Hours worked on site").value).toBe("6");
    expect(field("Stakeholders present").value).toBe("4");
    expect(field("Meeting contacts").value).toBe("Sam Rivers (Harbour Formwork)");
    expect(field("Deliveries received").value).toBe("Formwork ply x40");
    expect(field("Notes / observations").value).toBe("Perimeter fencing checked at 4pm.");
    expect(screen.getByRole("button", { name: "Delivery" }).className).toContain("bg-blue-900");
    expect(field("Weather").value).toBe(WEATHER.summary);
    expect(field("Wind").value).toBe(WEATHER.wind);
  });

  test("changing the date refreshes the lookup's own earlier fill", async () => {
    render(<SiteDiary />);
    await waitFor(() => expect(weather.calls).toBe(1));
    await resolveWeather(WEATHER);
    await screen.findByText(/Auto-filled for Geelong/);
    expect(field("Weather").value).toBe(WEATHER.summary);

    typeInto("Date", "2026-09-01");
    await waitFor(() => expect(weather.calls).toBe(2));
    await resolveWeather({ summary: "17°C · Rain", wind: "31 km/h", place: "Geelong" });
    await waitFor(() => expect(field("Weather").value).toBe("17°C · Rain"));
    expect(field("Wind").value).toBe("31 km/h");
  });

  test("weather typed by hand is not replaced when the lookup resolves", async () => {
    render(<SiteDiary />);
    await waitFor(() => expect(weather.calls).toBeGreaterThan(0));

    typeInto("Weather", "Overcast");
    typeInto("Wind", "5 km/h");
    typeInto("Notes / observations", "Rain expected; slab pour postponed.");

    await resolveWeather(WEATHER);
    await screen.findByText(/Auto-filled for Geelong/);

    expect(field("Weather").value).toBe("Overcast");
    expect(field("Wind").value).toBe("5 km/h");
    expect(field("Notes / observations").value).toBe("Rain expected; slab pour postponed.");
  });

  test("the saved entry carries the typed values plus the auto-filled weather", async () => {
    render(<SiteDiary />);
    await waitFor(() => expect(weather.calls).toBeGreaterThan(0));

    typeInto("Notes / observations", "Site induction for two new starters.");
    typeInto("Hours worked on site", "7");
    await resolveWeather(WEATHER);
    await screen.findByText(/Auto-filled for Geelong/);

    fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));
    await waitFor(() => expect(diary.addEntry).toHaveBeenCalledTimes(1));
    expect(diary.addEntry.mock.calls[0][0]).toMatchObject({
      project: PROJECT.id,
      notes: "Site induction for two new starters.",
      hours: "7",
      weather: WEATHER.summary,
      wind: WEATHER.wind,
    });
  });

  test("a failed lookup leaves the form untouched and asks for manual entry", async () => {
    render(<SiteDiary />);
    await waitFor(() => expect(weather.calls).toBeGreaterThan(0));
    typeInto("Notes / observations", "Dead spot on site, no forecast.");
    await resolveWeather(null);
    await screen.findByText(/Couldn't fetch the weather/);
    expect(field("Notes / observations").value).toBe("Dead spot on site, no forecast.");
    expect(field("Weather").value).toBe("");
  });
});
