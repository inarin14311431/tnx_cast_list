export function displayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

export function formatHandle(handle) {
  if (!handle) {
    return "NO HANDLE";
  }

  return `“${handle}”`;
}


