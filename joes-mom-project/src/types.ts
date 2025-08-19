export type CPTLine = {
  code: string;
  count: number;
  initialPayment: number; // amount insurer already paid
};

export type Submission = {
  id: string; // internal UUID you generate client-side for now
  claimNo: string;
  patient: string;
  insurance: string; // insurer name (normalized)
  providerAccountNo: string;
  doctor: string;
  dateOfService: string; // ISO date (yyyy-MM-dd)
  submitterEmail: string;
  cpts: CPTLine[]; // 1..7 lines
  totals: { paid: number; billed: number };
  dateSubmittedIso: string; // ISO timestamp
  dueDateIso: string; // business +30 days
};

export type ApiCreateSubmissionResponse = {
  ok: boolean;
  message: string;
  insurerEmail?: string;
  documentUrl?: string; // link to generated PDF/doc (server fills)
};
