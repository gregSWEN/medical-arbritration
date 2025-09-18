// backend/lib/phase.js
const GRACE_DAYS = 4;
const MISSED_DAYS = 2;

function computePhase(due) {
  if (!due) return { phase: "", phaseEndIso: "" };
  const now = new Date();
  const dueAt = new Date(due);
  if (isNaN(dueAt)) return { phase: "", phaseEndIso: "" };

  const graceEnd = new Date(dueAt.getTime() + GRACE_DAYS * 86400000);
  const missedEnd = new Date(graceEnd.getTime() + MISSED_DAYS * 86400000);

  if (now < dueAt)
    return { phase: "Pending", phaseEndIso: dueAt.toISOString() };
  if (now < graceEnd)
    return { phase: "Grace Period", phaseEndIso: graceEnd.toISOString() };
  if (now < missedEnd)
    return { phase: "Missed", phaseEndIso: missedEnd.toISOString() };
  return { phase: "Expired", phaseEndIso: "" };
}

module.exports = { computePhase, GRACE_DAYS, MISSED_DAYS };
