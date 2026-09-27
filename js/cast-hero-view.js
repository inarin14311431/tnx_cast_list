/* Pure view model for the public cast hero: names, style slots and divine works.
 * No DOM access. cast.js owns the markup built from these values.
 */
import { STYLE_DATA } from "./style-data.js";

const OUTER_QUOTES = /^[\s　]*[“”"「『](.*)[“”"」』][\s　]*$/s;

/* Official readings that differ from the style data's spelling (which the editor copies into divine_n_yomi). */
const DIVINE_YOMI_OVERRIDES = new Map([["死の舞踏", "ダンスマカブル"], ["天変地異", "カタストロフ"], ["突然変異", "ミューテーション"]]);
const divineYomiByName = new Map(DIVINE_YOMI_OVERRIDES);
for (const item of STYLE_DATA) {
  if (item.divine && !divineYomiByName.has(item.divine)) divineYomiByName.set(item.divine, item.divineYomi || "");
}

export function stripOuterQuotes(value) {
  let text = String(value ?? "").trim();
  for (let index = 0; index < 8; index++) {
    const match = text.match(OUTER_QUOTES);
    if (!match) break;
    const next = String(match[1] ?? "").trim();
    if (next === text) break;
    text = next;
  }
  return text;
}

export function styleStateFor(mark) {
  const value = String(mark || "").trim();
  if (value.includes("◎") && value.includes("●")) return "is-dual";
  if (value.includes("◎")) return "is-persona";
  if (value.includes("●")) return "is-key";
  return "is-standard";
}

/* Style slots keep their sheet position (01-03) so divine work n can follow style n. */
export function buildStyleSlots(character) {
  const entries = [1, 2, 3]
    .map(slot => ({ slot, name: String(character?.[`style_${slot}`] ?? "").trim(), mark: String(character?.[`style_${slot}_mark`] ?? "").trim() }))
    .filter(entry => entry.name);
  const personaNames = new Set(entries.filter(({ mark }) => mark.includes("◎")).map(({ name }) => name));
  const keyNames = new Set(entries.filter(({ mark }) => mark.includes("●")).map(({ name }) => name));
  const shownShadowNames = new Set();

  const roleFor = (name, mark) => {
    const hasPersona = mark.includes("◎");
    const hasKey = mark.includes("●");
    if (hasPersona && hasKey) return "PERSONA=KEY";
    if (hasPersona) return "PERSONA";
    if (hasKey) return "KEY";
    if (!personaNames.has(name) && !keyNames.has(name) && !shownShadowNames.has(name)) {
      shownShadowNames.add(name);
      return "SHADOW";
    }
    return "";
  };

  return entries.map(({ slot, name, mark }) => {
    const state = styleStateFor(mark);
    return { slot, number: String(slot).padStart(2, "0"), name, mark, state, role: roleFor(name, mark), featured: state !== "is-standard" };
  });
}

const comparable = value => String(value ?? "").replace(/[\s　！!？?]/g, "");

/* Official spelling first, then the stored reading, then the style data. A reading equal to
 * the name (the editor's fallback when no reading exists) is not shown. */
export function resolveDivineYomi(name, storedYomi) {
  const divineName = String(name ?? "").trim();
  for (const candidate of [DIVINE_YOMI_OVERRIDES.get(divineName), storedYomi, divineYomiByName.get(divineName)]) {
    const yomi = String(candidate ?? "").trim();
    if (yomi && comparable(yomi) !== comparable(divineName)) return yomi;
  }
  return "";
}

export function buildDivineSlots(character) {
  return [1, 2, 3]
    .map(slot => {
      const style = String(character?.[`style_${slot}`] ?? "").trim();
      const name = String(character?.[`divine_${slot}`] ?? "").trim();
      const number = String(slot).padStart(2, "0");
      return {
        slot,
        style,
        name,
        code: `MIRACLE-${number}`,
        yomi: name ? resolveDivineYomi(name, character?.[`divine_${slot}_yomi`]) : "",
        state: style ? styleStateFor(character?.[`style_${slot}_mark`]) : "is-standard"
      };
    })
    .filter(item => item.style || item.name);
}
