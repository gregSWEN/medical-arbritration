// import { render, screen, waitFor, within } from "@testing-library/react";
// import SubmissionsPage from "@/pages/SubmissionsPage";

// // Mock API module used by SubmissionsPage
// vi.mock("@/services/api", () => {
//   return {
//     api: {
//       listSubmissions: vi.fn().mockResolvedValue({
//         items: [
//           {
//             _id: "abc123",
//             claimNo: "CLM-001",
//             insurance: "MERITAIN HEALTH",
//             doctor: "Dr. Greg",
//             patientName: "GREG",
//             cpts: [{ code: "95868", count: 1, initialPayment: 123 }],
//             totals: { billed: 71500, paid: 306 },
//             dateSubmittedIso: "2025-08-21T20:53:09.394Z",
//             dueDateIso: "2025-10-02T20:52:04.681Z",
//             phase: "Pending",
//             phaseEndIso: "2025-10-02T20:52:04.681Z",
//           },
//         ],
//       }),
//       exportSubmissionsCsv: vi.fn(),
//     },
//   };
// });

// describe("SubmissionsPage", () => {
//   beforeEach(() => {
//     // Make sure there's some token so your app doesn't early-return anywhere
//     localStorage.setItem("token", "TEST_TOKEN");
//   });

//   it("renders a row from the mocked API", async () => {
//     render(<SubmissionsPage />);

//     // Heading
//     expect(await screen.findByText(/Recent Submissions/i)).toBeInTheDocument();

//     // Wait for the table row to appear
//     const cell = await screen.findByText("CLM-001");
//     const row = cell.closest("tr");
//     expect(row).toBeTruthy();

//     // Assert some cells in the row
//     within(row as HTMLElement).getByText("MERITAIN HEALTH");
//     within(row as HTMLElement).getByText("Dr. Greg");
//     within(row as HTMLElement).getByText(/Pending/);
//     within(row as HTMLElement).getByText(/\$71,500\.00/); // billed
//     within(row as HTMLElement).getByText(/\$306\.00/); // paid
//   });

//   it("shows Export button", async () => {
//     render(<SubmissionsPage />);
//     const btn = await screen.findByRole("button", { name: /Export CSV/i });
//     expect(btn).toBeEnabled();
//   });
// });
