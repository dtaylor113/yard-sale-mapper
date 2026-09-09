import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// Leaflet sizes itself from real layout measurements that jsdom doesn't
// provide, and the map isn't what any of these tests are about.
vi.mock("@/components/stop-map", () => ({
  StopMap: () => <div data-testid="stop-map" />,
}));

import { AdminProvider } from "@/lib/admin-provider";
import { useData } from "@/lib/data-context";
import { DataProvider } from "@/lib/data-provider";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { EventDetailPage } from "./event-detail-page";

const CLINTON = MOCK_EVENTS[0];
const STERLING = MOCK_EVENTS[1];

const CLINTON_PATH = `/events/clinton-town-wide-yard-sale-${CLINTON.id}`;
const STERLING_PATH = `/events/sterling-neighborhood-sale-${STERLING.id}`;

/** The name an admin might rename to, typo and all. */
const RENAMED = "Sterlng Summer Sale";
const RENAMED_PATH = `/events/sterlng-summer-sale-${CLINTON.id}`;

function CurrentPath() {
  return <div data-testid="path">{useLocation().pathname}</div>;
}

/**
 * Stands in for the parts of the app these tests aren't rendering: an admin
 * editing the event, and links elsewhere in the site pointing back here.
 */
function Harness() {
  const navigate = useNavigate();
  const { getEvent, updateEvent } = useData();

  async function rename(id: string, name: string) {
    const event = getEvent(id);
    if (!event) throw new Error(`fixture event ${id} is missing`);
    await updateEvent(id, {
      name,
      description: event.description,
      eventDate: event.eventDate,
      status: event.status,
    });
  }

  return (
    <div>
      <button type="button" onClick={() => rename(CLINTON.id, RENAMED)}>
        rename clinton
      </button>
      <button type="button" onClick={() => navigate(CLINTON_PATH)}>
        follow original clinton link
      </button>
      <button type="button" onClick={() => navigate(STERLING_PATH)}>
        go to sterling
      </button>
    </div>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminProvider>
        <DataProvider>
          <Routes>
            <Route path="/" element={<p>Event list</p>} />
            <Route path="/events/:eventSlug" element={<EventDetailPage />} />
          </Routes>
          <Harness />
          <CurrentPath />
        </DataProvider>
      </AdminProvider>
    </MemoryRouter>,
  );
}

function pathIs(expected: string) {
  return waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent(expected), {
    timeout: 3000,
  });
}

describe("event URL resolution", () => {
  it("loads the event when the slug is current", async () => {
    renderAt(CLINTON_PATH);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(CLINTON.name);
  });

  it("redirects a stale slug to the current one", async () => {
    renderAt(`/events/some-name-from-last-year-${CLINTON.id}`);

    await pathIs(CLINTON_PATH);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(CLINTON.name);
  });

  it("resolves a bare id and canonicalizes it", async () => {
    renderAt(`/events/${CLINTON.id}`);

    await pathIs(CLINTON_PATH);
  });

  it("shows the not-found state for an unknown id without redirecting", async () => {
    const unknown = "/events/clinton-town-wide-yard-sale-nope99";
    renderAt(unknown);

    expect(await screen.findByText(/doesn't exist/i)).toBeInTheDocument();
    expect(screen.getByTestId("path")).toHaveTextContent(unknown);
  });
});

describe("renaming an event", () => {
  it("moves the URL to the new slug", async () => {
    const user = userEvent.setup();
    renderAt(CLINTON_PATH);
    await screen.findByRole("heading", { level: 1 });

    await user.click(screen.getByRole("button", { name: "rename clinton" }));

    await pathIs(RENAMED_PATH);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(RENAMED);
  });

  it("keeps links shared before the rename working", async () => {
    // The whole point of pinning the id to the end of the slug: a link already
    // texted around still resolves, and forwards to the current URL.
    const user = userEvent.setup();
    renderAt(CLINTON_PATH);
    await screen.findByRole("heading", { level: 1 });

    await user.click(screen.getByRole("button", { name: "rename clinton" }));
    await pathIs(RENAMED_PATH);

    await user.click(screen.getByRole("button", { name: "follow original clinton link" }));

    await pathIs(RENAMED_PATH);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(RENAMED);
    expect(screen.queryByText(/doesn't exist/i)).not.toBeInTheDocument();
  });
});

describe("stop selection", () => {
  it("starts with every stop selected", async () => {
    renderAt(CLINTON_PATH);

    expect(await screen.findByText("32 of 32 selected")).toBeInTheDocument();
  });

  it("survives the redirect when a rename changes the slug", async () => {
    // Regression guard: the selection is keyed off the event id, not the URL
    // segment. Keying it off the segment would make canonicalization look like
    // a move to a different event and silently re-check everything.
    const user = userEvent.setup();
    renderAt(CLINTON_PATH);
    await screen.findByText("32 of 32 selected");

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    expect(screen.getByText("30 of 32 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "rename clinton" }));
    await pathIs(RENAMED_PATH);

    expect(screen.getByText("30 of 32 selected")).toBeInTheDocument();
  });

  it("resets when moving to a different event", async () => {
    const user = userEvent.setup();
    renderAt(CLINTON_PATH);
    await screen.findByText("32 of 32 selected");

    await user.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText("31 of 32 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "go to sterling" }));

    expect(await screen.findByText("6 of 6 selected")).toBeInTheDocument();
  });
});
