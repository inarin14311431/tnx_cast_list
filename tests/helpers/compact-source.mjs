/* Contract tests match runtime source with regular expressions written against compact code.
 * Compact the source (whitespace and trailing commas only) so these checks keep asserting the
 * same tokens regardless of how the file is formatted. String contents are not edited except
 * for whitespace next to punctuation, which no contract pattern depends on. */
export function compactSource(source) {
  return String(source)
    .replace(/[ \t\r\n]+/g, " ")
    .replace(/ ?([{}()[\],;:=<>!&|+\-*/?.]) ?/g, "$1")
    .replace(/,(?=[)\]}])/g, "")
    .trim();
}
