/* Legacy import finalization overlay disabled.
 * The original importer now owns progress reporting, including the outfit name
 * currently being converted, and performs the normal per-outfit redraw cycle. */
(() => {
  if (document.querySelector('script[data-current-tsv-import]')) return;
  const script = document.createElement('script');
  script.src = './js/tsv-import-current.js?v=1';
  script.dataset.currentTsvImport = '1';
  document.head.append(script);
})();

/* Birthplace field for the sheet editor. */
(async () => {
  const DEFAULT_BIRTHPLACE = 'Ｎ◎ＶＡ';
  const SAVE_DELAY = 700;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  const citizenRank = document.querySelector('#citizen-rank');
  const grid = citizenRank?.closest('.basic-profile-grid');
  if (!citizenRank || !grid || document.querySelector('#birthplace')) return;

  const label = document.createElement('label');
  label.textContent = '出身';
  const input = document.createElement('input');
  input.id = 'birthplace';
  input.type = 'text';
  input.maxLength = 160;
  input.value = DEFAULT_BIRTHPLACE;
  input.placeholder = DEFAULT_BIRTHPLACE;
  label.append(input);
  citizenRank.closest('label')?.insertAdjacentElement('afterend', label);

  let supabase;
  let loadedPublicId = '';
  let saveTimer = 0;
  let loading = true;

  try {
    ({ supabase } = await import('./supabase-client.js'));
  } catch (error) {
    console.error('[birthplace] Supabase client could not be loaded.', error);
    loading = false;
    return;
  }

  const currentPublicId = () => new URLSearchParams(location.search).get('id') || '';

  async function loadBirthplace() {
    const publicId = currentPublicId();
    if (!publicId || publicId === loadedPublicId) {
      loading = false;
      return;
    }

    const { data, error } = await supabase
      .from('characters')
      .select('birthplace')
      .eq('public_id', publicId)
      .maybeSingle();

    if (error) {
      console.error('[birthplace] Failed to load birthplace.', error);
      loading = false;
      return;
    }

    loadedPublicId = publicId;
    input.value = String(data?.birthplace || DEFAULT_BIRTHPLACE);
    loading = false;
  }

  async function saveBirthplace() {
    const publicId = currentPublicId();
    if (!publicId) return false;

    const value = input.value.trim() || DEFAULT_BIRTHPLACE;
    input.value = value;

    const { error } = await supabase
      .from('characters')
      .update({ birthplace: value })
      .eq('public_id', publicId);

    if (error) {
      console.error('[birthplace] Failed to save birthplace.', error);
      return false;
    }

    loadedPublicId = publicId;
    return true;
  }

  function queueSave() {
    if (loading) return;
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
      if (await saveBirthplace()) return;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await wait(500);
        if (await saveBirthplace()) return;
      }
    }, SAVE_DELAY);
  }

  input.addEventListener('input', queueSave);
  input.addEventListener('change', queueSave);
  document.querySelector('#save-button')?.addEventListener('click', () => {
    clearTimeout(saveTimer);
    window.setTimeout(saveBirthplace, 250);
    window.setTimeout(saveBirthplace, 1000);
  });

  await loadBirthplace();

  let lastUrl = location.href;
  const urlObserver = window.setInterval(() => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    loading = false;
    queueSave();
  }, 400);
  window.addEventListener('pagehide', () => clearInterval(urlObserver), { once: true });
})();
