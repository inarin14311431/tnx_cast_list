/* Load the current SKD/OFC TSV importer. */
(() => {
  if (document.querySelector('script[data-current-tsv-import]')) return;
  const script = document.createElement('script');
  script.src = './js/tsv-import-current.js?v=2';
  script.dataset.currentTsvImport = '1';
  document.head.append(script);
})();

/* Birthplace field integrated into the main transactional manual save.
 * No independent debounce, retry loop, or direct UPDATE is performed here.
 */
(async () => {
  const DEFAULT_BIRTHPLACE = 'Ｎ◎ＶＡ';
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
  try {
    ({ supabase } = await import('./supabase-client.js'));
  } catch (error) {
    console.error('[birthplace] Supabase client could not be loaded.', error);
    return;
  }

  const publicId = new URLSearchParams(location.search).get('id') || '';
  if (publicId) {
    const { data, error } = await supabase
      .from('characters')
      .select('birthplace')
      .eq('public_id', publicId)
      .maybeSingle();

    if (error) {
      console.error('[birthplace] Failed to load birthplace.', error);
    } else {
      input.value = String(data?.birthplace || DEFAULT_BIRTHPLACE);
    }
  }

  const originalRpc = supabase.rpc.bind(supabase);
  if (!supabase.__tnxManualSaveBirthplacePatched) {
    supabase.rpc = function patchedRpc(functionName, args, options) {
      if (functionName === 'save_character_bundle' && args?.p_character) {
        args.p_character.birthplace = input.value.trim() || DEFAULT_BIRTHPLACE;
      }
      return originalRpc(functionName, args, options);
    };
    Object.defineProperty(supabase, '__tnxManualSaveBirthplacePatched', {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  input.addEventListener('input', () => {
    const status = document.querySelector('#save-status');
    if (status) {
      status.textContent = '未保存';
      status.className = 'unsaved';
    }
  });
})();
