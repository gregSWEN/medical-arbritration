// Maps your submission + user profile -> template variables
function buildTemplateData(submission, user) {
  // buildTemplateData.js (map portion)
  // Assumes you have `submission` (the created Submission doc) and `user` (signup profile)

  const rows = Array.from({ length: 7 }, (_, i) => submission.cpts?.[i] ?? {});
  const fmtUSD = (n) =>
    n == null || n === "" ? "" : `$${Number(n).toFixed(2)}`;
  const date_submitted = (() => {
    const d = submission.dateSubmittedIso
      ? new Date(submission.dateSubmittedIso)
      : new Date();
    return isNaN(d) ? "" : d.toLocaleDateString("en-US");
  })();

  const map = {
    // Header line
    doctor_header: submission.doctor || "",
    insurance: submission.insurance || "",

    // Signature block (from signup profile)
    name_from_signup: user?.name || "",
    address_from_signup: user?.mailingAddress || "",
    phone_number_from_signup: user?.phone || "",
    email_from_signup: user?.email || "",
    date_submitted,

    // Row 1
    description_1: "IONM",
    claim_no_1: submission.claimNo || "",
    provider_name_1: "SPINE MEDICAL SERVICES",
    doctor_name_1: submission.doctor || "",
    dos_1: submission.dateOfService || "",
    cpt_code_1: rows[0].code || "",
    initial_payment_1: fmtUSD(rows[0].initialPayment),
    offer_value_1: "",

    // Row 2
    description_2: "IONM",
    claim_no_2: submission.claimNo || "",
    provider_name_2: "SPINE MEDICAL SERVICES",
    doctor_name_2: submission.doctor || "",
    dos_2: submission.dateOfService || "",
    cpt_code_2: rows[1].code || "",
    initial_payment_2: fmtUSD(rows[1].initialPayment),
    offer_value_2: "",

    // Row 3
    description_3: "IONM",
    claim_no_3: submission.claimNo || "",
    provider_name_3: "SPINE MEDICAL SERVICES",
    doctor_name_3: submission.doctor || "",
    dos_3: submission.dateOfService || "",
    cpt_code_3: rows[2].code || "",
    initial_payment_3: fmtUSD(rows[2].initialPayment),
    offer_value_3: "",

    // Row 4
    description_4: "IONM",
    claim_no_4: submission.claimNo || "",
    provider_name_4: "SPINE MEDICAL SERVICES",
    doctor_name_4: submission.doctor || "",
    dos_4: submission.dateOfService || "",
    cpt_code_4: rows[3].code || "",
    initial_payment_4: fmtUSD(rows[3].initialPayment),
    offer_value_4: "",

    // Row 5
    description_5: "IONM",
    claim_no_5: submission.claimNo || "",
    provider_name_5: "SPINE MEDICAL SERVICES",
    doctor_name_5: submission.doctor || "",
    dos_5: submission.dateOfService || "",
    cpt_code_5: rows[4].code || "",
    initial_payment_5: fmtUSD(rows[4].initialPayment),
    offer_value_5: "",

    // Row 6
    description_6: "IONM",
    claim_no_6: submission.claimNo || "",
    provider_name_6: "SPINE MEDICAL SERVICES",
    doctor_name_6: submission.doctor || "",
    dos_6: submission.dateOfService || "",
    cpt_code_6: rows[5].code || "",
    initial_payment_6: fmtUSD(rows[5].initialPayment),
    offer_value_6: "",

    // Row 7
    description_7: "IONM",
    claim_no_7: submission.claimNo || "",
    provider_name_7: "SPINE MEDICAL SERVICES",
    doctor_name_7: submission.doctor || "",
    dos_7: submission.dateOfService || "",
    cpt_code_7: rows[6].code || "",
    initial_payment_7: fmtUSD(rows[6].initialPayment),
    offer_value_7: "",
  };

  return map;
}

module.exports = { buildTemplateData };
