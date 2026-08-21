export function collectStyleInputSnapshot({ root = document, count = 3 } = {}) {
  return Array.from({ length: count }, (_, index) => {
    const i = index + 1;
    return {
      name: root.querySelector(`#style-${i}`)?.value ?? "",
      mark: root.querySelector(`#style-${i}-mark`)?.value ?? "",
      attribute: root.querySelector(`#style-${i}-attribute`)?.value ?? ""
    };
  });
}

export function applyStyleInputSnapshot({ root = document, data = {}, count = 3 } = {}) {
  for (let i = 1; i <= count; i++) {
    const style = root.querySelector(`#style-${i}`);
    const mark = root.querySelector(`#style-${i}-mark`);
    const attribute = root.querySelector(`#style-${i}-attribute`);
    if (style) style.value = data[`style_${i}`] ?? "";
    if (mark) mark.value = data[`style_${i}_mark`] ?? "";
    if (attribute) attribute.value = data[`style_${i}_attribute`] ?? "";
  }
}
