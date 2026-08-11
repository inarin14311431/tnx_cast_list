import { supabase } from "./supabase-client.js";

const SAVE_RPC = "save_character_bundle";
let lastRpcError = null;
let lastRpcAt = 0;

installStyles();
installPanel();
patchSaveRpc();
observeSaveStatus();

function installStyles() {
  if (document.querySelector('#sheet-save-diagnostics-style')) return;
  const link = document.createElement('link');
  link.id = 'sheet-save-diagnostics-style';
  link.rel = 'stylesheet';
  link.href = './css-next/components/save-diagnostics.css?v=1';
  document.head.append(link);
}

function installPanel() {
  if (document.querySelector('#save-diagnostics')) return;
  const save = document.querySelector('#save-button');
  if (!save) return;

  const panel = document.createElement('section');
  panel.id = 'save-diagnostics';
  panel.className = 'save-diagnostics';
  panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  panel.innerHTML = `
    <header class="save-diagnostics__header">
      <strong>保存エラー詳細</strong><small>SAVE DIAGNOSTICS</small>
    </header>
    <p class="save-diagnostics__summary" data-save-diagnostic-summary></p>
    <dl class="save-diagnostics__facts">
      <div><dt>失敗箇所</dt><dd data-save-diagnostic-stage></dd></div>
      <div><dt>原因</dt><dd data-save-diagnostic-cause></dd></div>
      <div><dt>対処</dt><dd data-save-diagnostic-action></dd></div>
    </dl>
    <details class="save-diagnostics__technical">
      <summary>技術情報を表示</summary>
      <dl>
        <div><dt>CODE</dt><dd data-save-diagnostic-code>—</dd></div>
        <div><dt>MESSAGE</dt><dd data-save-diagnostic-message>—</dd></div>
        <div><dt>DETAILS</dt><dd data-save-diagnostic-details>—</dd></div>
        <div><dt>HINT</dt><dd data-save-diagnostic-hint>—</dd></div>
      </dl>
    </details>`;
  save.insertAdjacentElement('afterend', panel);
}

function patchSaveRpc() {
  if (supabase.__tnxSaveDiagnosticsPatched) return;
  const originalRpc = supabase.rpc.bind(supabase);

  Object.defineProperty(supabase, '__tnxSaveDiagnosticsPatched', {
    configurable: false,
    enumerable: false,
    value: true
  });

  supabase.rpc = async (fn, args, options) => {
    try {
      const result = await originalRpc(fn, args, options);
      if (fn === SAVE_RPC) {
        lastRpcAt = Date.now();
        lastRpcError = result?.error || null;
        if (lastRpcError) queueMicrotask(refreshFromStatus);
      }
      return result;
    } catch (error) {
      if (fn === SAVE_RPC) {
        lastRpcAt = Date.now();
        lastRpcError = normalizeThrownError(error);
        queueMicrotask(refreshFromStatus);
      }
      throw error;
    }
  };
}

function observeSaveStatus() {
  const status = document.querySelector('#save-status');
  if (!status) return;
  new MutationObserver(refreshFromStatus).observe(status, {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
  refreshFromStatus();
}

function refreshFromStatus() {
  installPanel();
  const status = document.querySelector('#save-status');
  const panel = document.querySelector('#save-diagnostics');
  if (!status || !panel) return;

  const state = status.className || '';
  if (!state.includes('error')) {
    panel.hidden = true;
    if (state.includes('saved')) {
      lastRpcError = null;
      lastRpcAt = 0;
    }
    return;
  }

  const statusText = String(status.textContent || '').trim();
  const freshRpcError = Date.now() - lastRpcAt < 10000 ? lastRpcError : null;
  const diagnosis = diagnose(statusText, freshRpcError);

  setText(panel, '[data-save-diagnostic-summary]', diagnosis.summary);
  setText(panel, '[data-save-diagnostic-stage]', diagnosis.stage);
  setText(panel, '[data-save-diagnostic-cause]', diagnosis.cause);
  setText(panel, '[data-save-diagnostic-action]', diagnosis.action);
  setText(panel, '[data-save-diagnostic-code]', freshRpcError?.code || '—');
  setText(panel, '[data-save-diagnostic-message]', freshRpcError?.message || statusText || '—');
  setText(panel, '[data-save-diagnostic-details]', freshRpcError?.details || '—');
  setText(panel, '[data-save-diagnostic-hint]', freshRpcError?.hint || '—');
  panel.hidden = false;
}

function diagnose(statusText, error) {
  const code = String(error?.code || '');
  const source = [statusText, error?.message, error?.details, error?.hint, code].filter(Boolean).join(' ');

  if (/キャスト名とプレイヤー名/.test(source)) {
    return result('入力内容を確認してください。', '保存前チェック', '必須項目が未入力です。', 'キャスト名とプレイヤー名を入力してから、もう一度保存してください。');
  }
  if (/network|fetch|Failed to fetch|NetworkError/i.test(source)) {
    return result('サーバーへ接続できませんでした。', '通信', 'ネットワーク接続またはSupabaseへの通信に失敗しました。', '通信状態を確認し、画面を閉じずに再度保存してください。');
  }
  if (/42501|row-level security|RLS|permission denied/i.test(source)) {
    return result('保存権限で拒否されました。', 'データベース書込', 'ログイン状態またはRLSの権限制御により書き込みが拒否されています。', 'ログイン状態を確認してください。継続する場合は管理側でRLS設定を確認します。');
  }
  if (/PGRST202|save_character_bundle|Could not find the function/i.test(source)) {
    return result('保存用のデータベース機能を呼び出せません。', '保存処理開始', 'save_character_bundle が見つからないか、Supabaseのschema cacheが古い状態です。', '管理側で保存RPCとSupabaseのschema cacheを確認します。');
  }
  if (/23502|not-null|null value/i.test(source)) {
    return result('必須データが不足しています。', 'データベース書込', 'データベース上の必須項目に空の値が送られています。', '技術情報のDETAILSに項目名が表示されていれば、その項目を確認します。');
  }
  if (/23514|check constraint|violates check/i.test(source)) {
    return result('入力値がデータベースの許容範囲外です。', 'データベース検証', '保存値がDBの制約条件に一致していません。', '技術情報のMESSAGE / DETAILSに表示される制約名を基に対象項目を確認します。');
  }
  if (/22001|value too long|too long for type/i.test(source)) {
    return result('入力文字数が上限を超えています。', 'データベース検証', 'いずれかの文字列がDBの保存可能な長さを超えています。', '技術情報のDETAILSを確認し、該当する長文項目を短くします。');
  }
  if (/23505|duplicate key|unique constraint/i.test(source)) {
    return result('重複データのため保存できません。', 'データベース検証', '一意である必要がある値が既存データと重複しています。', '技術情報に表示される制約名またはDETAILSを基に対象データを確認します。');
  }
  if (/schema cache/i.test(source)) {
    return result('データベース定義を確認できません。', '保存処理開始', 'Supabaseのschema cacheと現在のアプリ定義が一致していません。', '管理側でschema cacheを再読み込みし、DB定義との差分を確認します。');
  }
  if (/保存結果を確認できません/.test(source)) {
    return result('保存処理の結果を確認できませんでした。', '保存結果確認', '保存APIからキャストIDまたは公開IDが返りませんでした。', '画面を再読み込みする前に、技術情報とDB側の保存結果を確認します。');
  }

  return result(
    '保存処理でエラーが発生しました。',
    error ? 'データベース書込' : '保存処理',
    error?.message || statusText || '原因を自動判定できませんでした。',
    error ? '下の技術情報を確認すると、DBエラーコード・詳細・ヒントを特定できます。' : '表示されているエラー内容を基に対象項目を確認します。'
  );
}

function result(summary, stage, cause, action) {
  return { summary, stage, cause, action };
}

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) element.textContent = value || '—';
}

function normalizeThrownError(error) {
  if (error && typeof error === 'object') return error;
  return { message: String(error || '') };
}
