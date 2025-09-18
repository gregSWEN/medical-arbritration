import { render, screen } from "@testing-library/react";
import StatusBadge from "@/components/StatusBadge";

describe("StatusBadge", () => {
  it("renders fallback when phase empty", () => {
    render(<StatusBadge />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders Pending", () => {
    render(<StatusBadge phase="Pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders Missed", () => {
    render(<StatusBadge phase="Missed" />);
    const el = screen.getByText("Missed");
    expect(el).toBeInTheDocument();
    // optional: assert some class presence
    expect(el.className).toMatch(/bg-rose-50/);
  });
});
