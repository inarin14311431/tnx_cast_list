/* The deluxe ACT SHOWCASE page loads six bundled stylesheets (see act-showcase.html). Each bundle
 * keeps the original per-file sources joined by `from:` boundary comments. These helpers give the
 * contract tests the same per-source text and the same load order they asserted before bundling. */
import { readFileSync } from "node:fs";

const pagesDir = new URL("../../css-next/pages/", import.meta.url);
const readPage = name => readFileSync(new URL(name, pagesDir), "utf8");
const BOUNDARY = /\/\* ==== from: (\S+) ==== \*\/\n/g;

export function actShowcaseLinkedStylesheets() {
  const html = readFileSync(new URL("../../act-showcase.html", import.meta.url), "utf8");
  return [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\.\/css-next\/pages\/([^"?]+)\?v=([^"]+)"/g)]
    .map(match => ({ file: match[1], version: match[2] }));
}

function sourcesOf({ file, version }) {
  const text = readPage(file);
  const marks = [...text.matchAll(BOUNDARY)];
  if (!marks.length) return [{ file, version, text }];
  return marks.map((mark, index) => ({
    file: mark[1],
    version,
    text: text.slice(mark.index + mark[0].length, marks[index + 1]?.index ?? text.length)
  }));
}

/* Every original source in cascade order (the order the former act-showcase-entry.css imported them). */
export function actShowcaseSources() {
  return actShowcaseLinkedStylesheets().flatMap(link => sourcesOf(link));
}

/* Text of one original source file, e.g. actShowcaseCss("act-showcase-cinematic-v2"). */
export function actShowcaseCss(name) {
  const file = `${name}.css`;
  const source = actShowcaseSources().find(item => item.file === file);
  if (!source) throw new Error(`${file} is not part of the act-showcase stylesheet bundles`);
  return source.text;
}

/* Sources appended after the final visual-emphasis layer. They style only their own namespace (checked in
 * tests/act-showcase-assign-cards-css.test.mjs), so "visual emphasis is the final layer" still holds for every
 * pre-existing rule; actShowcaseCssEntry() lists the pre-existing sources only. */
export const TRAILING_SOURCES = ["act-showcase-assign-cards-theme.css"];

export function actShowcaseTrailingSources() {
  return actShowcaseSources().filter(item => TRAILING_SOURCES.includes(item.file));
}

/* An import list in cascade order (versions are those of the bundle link that loads each source);
 * tests compare indexOf() positions of the source names. */
export function actShowcaseCssEntry() {
  return actShowcaseSources()
    .filter(item => !TRAILING_SOURCES.includes(item.file))
    .map(item => `@import "./${item.file}?v=${item.version}";`)
    .join("\n");
}
