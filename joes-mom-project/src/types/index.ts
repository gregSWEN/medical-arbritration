// src/types/index.ts
export type CptLine = {
  code: string;
  count: number;
  initialPayment: number;
};

export type Submission = {
  _id: string;
  claimNo: string;
  insurance: string;
  doctor: string;
  patientName?: string;
  patient?: string;
  dateOfService?: string;
  cpts: CptLine[];
  totals: { billed: number; paid: number };
  dateSubmittedIso: string;
  dueDateIso: string;
  workflowStatus?: "submitted" | "in_review" | "resolved" | "rejected";

  // computed on server
  phase?: "Pending" | "Grace Period" | "Missed" | "Expired" | "";
  phaseEndIso?: string;
};

export type User = {
  _id: string;
  email: string;
  name: string;
  phone: string;
  mailingAddress: string;
  createdAt?: string;
};
