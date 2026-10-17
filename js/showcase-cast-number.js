// CAST No: the number a cast is shown under in an act showcase. Empty = its position (1-based).
// Shared by the generator, the standalone output and both published views so they never disagree.
export const MAX_CAST_NUMBER = 6; // act_participants.cast_order is constrained to 1..6

export function normalizeCastNumber(value) {
  const digits = String(value ?? "").normalize("NFKC").replace(/[^0-9]/g, "");
  if (!digits) return "";
  const number = Number(digits);
  return number >= 1 && number <= MAX_CAST_NUMBER ? String(number) : "";
}

export function resolveCastNumber(value, index) {
  return Number(normalizeCastNumber(value)) || index + 1;
}

export function formatCastNumber(value, index) {
  return String(resolveCastNumber(value, index)).padStart(2, "0");
}

// Published data keeps the label ("CAST 05"); read the number back out of it.
export function castNumberFromSlot(slot, index) {
  const match = String(slot ?? "").normalize("NFKC").match(/CAST\s*0*(\d{1,2})/i);
  return resolveCastNumber(match?.[1], index);
}

export function findDuplicateCastNumber(values) {
  const seen = new Set();
  for (let index = 0; index < values.length; index += 1) {
    const number = resolveCastNumber(values[index], index);
    if (seen.has(number)) return number;
    seen.add(number);
  }
  return 0;
}
