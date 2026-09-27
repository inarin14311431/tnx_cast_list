export function parseTestSummary(output) {
  const text = String(output ?? "");
  const specPass = text.match(/^ℹ pass (\d+)$/m);
  const specFail = text.match(/^ℹ fail (\d+)$/m);
  const tapPass = text.match(/^# pass (\d+)$/m);
  const tapFail = text.match(/^# fail (\d+)$/m);

  const passMatch = specPass || tapPass;
  const failMatch = specFail || tapFail;
  if (!passMatch || !failMatch) {
    return { parsed: false, pass: null, fail: null };
  }

  return {
    parsed: true,
    pass: Number(passMatch[1]),
    fail: Number(failMatch[1])
  };
}
