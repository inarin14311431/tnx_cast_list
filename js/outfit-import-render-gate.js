/* Suspend outfit-list MutationObserver callbacks during a legacy batch import. */
(() => {
  const NativeMutationObserver = window.MutationObserver;
  if (!NativeMutationObserver || window.TNXOutfitRenderGate) return;

  const wrappers = new Set();

  class GatedMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.targets = new Set();
      this.pending = false;
      this.native = new NativeMutationObserver((records, observer) => {
        const outfitRoot = document.querySelector('#outfit-list');
        const watchesOutfits = outfitRoot && [...this.targets].some(target => target === outfitRoot || target.contains?.(outfitRoot));
        if (window.__tnxBatchImportActive && watchesOutfits) {
          this.pending = true;
          return;
        }
        callback(records, observer);
      });
      wrappers.add(this);
    }

    observe(target, options) {
      this.targets.add(target);
      return this.native.observe(target, options);
    }

    disconnect() {
      this.targets.clear();
      this.pending = false;
      return this.native.disconnect();
    }

    takeRecords() {
      return this.native.takeRecords();
    }

    flush() {
      if (!this.pending) return false;
      this.pending = false;
      this.callback([], this.native);
      return true;
    }
  }

  window.MutationObserver = GatedMutationObserver;
  window.TNXOutfitRenderGate = {
    flush() {
      let count = 0;
      for (const wrapper of wrappers) if (wrapper.flush()) count += 1;
      return count;
    }
  };
})();