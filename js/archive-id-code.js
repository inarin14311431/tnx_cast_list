(function(root){
  const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const MASK_20 = 0xFFFFF;

  function hash32(value, seed) {
    let hash = seed >>> 0;
    const text = String(value ?? "");
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
      hash ^= hash >>> 13;
      hash = Math.imul(hash, 0x85ebca6b) >>> 0;
      hash ^= hash >>> 16;
    }
    hash ^= text.length + 0x9e3779b9;
    hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b) >>> 0;
    return (hash ^ (hash >>> 16)) >>> 0;
  }

  function encode20(value) {
    let current = value & MASK_20;
    let output = "";
    for (let index = 0; index < 4; index++) {
      output = ALPHABET[current & 31] + output;
      current >>>= 5;
    }
    return output;
  }

  function format(value) {
    const source = String(value ?? "").trim();
    if (!source) return "TNX-VOID-VOID";
    const left = hash32(source, 0x811c9dc5) & MASK_20;
    const right = hash32(source, 0x6d2b79f5) & MASK_20;
    return `TNX-${encode20(left)}-${encode20(right)}`;
  }

  root.TNXArchiveId = Object.freeze({ format });
})(window);
