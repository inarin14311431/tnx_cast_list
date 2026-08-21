export function splitLegacyConcealment(value) {
  const text = String(value ?? "").trim();
  if (!text) return { value: "", modifier: "" };
  const match = text.match(/^\s*([^/（）()]+?)\s*(?:[／/]\s*([^/（）()]+)|[（(]\s*([^）)]+)\s*[）)])?\s*$/);
  return match
    ? { value: String(match[1] || "").trim(), modifier: String(match[2] || match[3] || "").trim() }
    : { value: text, modifier: "" };
}

export function parseLegacyDefense(value, fallbackOrder = "spi") {
  const text = String(value ?? "").trim();
  const output = { defense_s: "", defense_p: "", defense_i: "" };
  if (!text) return output;

  for (const match of text.matchAll(/(?:^|[\s,，/／])([SPI])\s*[:：]?\s*([^/／,，\s]+)/gi)) {
    output[`defense_${match[1].toLowerCase()}`] = match[2];
  }
  if (Object.values(output).some(Boolean)) return output;

  const parts = text.split(/[\/／,，\s]+/).filter(Boolean);
  const order = String(fallbackOrder || "spi").toLowerCase() === "sip" ? ["s", "i", "p"] : ["s", "p", "i"];
  order.forEach((key, index) => { output[`defense_${key}`] = parts[index] || ""; });
  return output;
}
