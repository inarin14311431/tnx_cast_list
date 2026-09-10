import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { TEST_OWNER_ID, assertTestIdentity, assertOwnedTarget, permitsMutation } from './owner-policy.js';

export { expect };
const clientSource = await readFile(new URL('../../js/supabase-client.js', import.meta.url), 'utf8');
const origin = clientSource.match(/const SUPABASE_URL = "([^"]+)"/)[1];
const apikey = clientSource.match(/const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)[1];
const readRpcs = new Set(['has_privileged_editor_tools', 'can_use_master_search', 'get_public_act_showcase']);

export const test = base.extend({
  context: async ({ context, request }, use) => {
    const state = await context.storageState();
    let token = '';
    for (const entry of state.origins || []) {
      const item = entry.localStorage.find(item => /^sb-.*-auth-token$/.test(item.name));
      if (item) token = JSON.parse(item.value).access_token || '';
    }
    const headers = { apikey, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (token) {
      const response = await request.get(`${origin}/auth/v1/user`, { headers });
      if (!response.ok()) throw new Error('E2E stopped: test session cannot be verified.');
      assertTestIdentity(await response.json());
    }
    const response = await request.get(`${origin}/rest/v1/characters?select=id,public_id,owner_id&owner_id=eq.${TEST_OWNER_ID}`, { headers });
    if (!response.ok()) throw new Error('E2E stopped: approved cast ownership cannot be loaded.');
    const records = await response.json();
    records.forEach(assertOwnedTarget);
    const castIds = new Set(records.map(row => row.id));
    const target = process.env.E2E_CAST_ID || process.env.TEST_CAST_ID || 'TNX-000091';
    if (token && !records.some(row => row.public_id === target)) throw new Error('E2E stopped: configured cast is not an accessible cast of the approved owner.');
    const violations = [];
    await context.route(`${origin}/**`, async route => {
      const req = route.request();
      const url = new URL(req.url());
      const method = req.method();
      if (url.pathname.startsWith('/rest/v1/')) {
        const table = url.pathname.slice('/rest/v1/'.length);
        if (method === 'GET' || method === 'HEAD') {
          if (['characters', 'troops', 'character_snapshots'].includes(table)) url.searchParams.append('owner_id', `eq.${TEST_OWNER_ID}`);
          if (['character_skills', 'character_outfits', 'character_combos'].includes(table)) url.searchParams.append('character_id', `in.(${[...castIds].join(',') || '00000000-0000-0000-0000-000000000000'})`);
          return route.continue({ url: url.href });
        }
        if (method === 'OPTIONS' || readRpcs.has(table.replace(/^rpc\//, ''))) return route.continue();
        let body;
        try { body = req.postDataJSON(); } catch { body = null; }
        if (permitsMutation({ table, method, search: url.searchParams, body, castIds, authenticated: Boolean(token) })) return route.continue();
      } else if (url.pathname.startsWith('/storage/v1/object/public/character-images/') && ['GET', 'HEAD'].includes(method)) {
        return route.continue();
      } else if (url.pathname.startsWith('/auth/v1/')) {
        return route.continue();
      } else if (url.pathname === '/functions/v1/character-sheet-source' && token) {
        return route.continue();
      }
      violations.push(`${method} ${url.pathname}`);
      return route.abort('blockedbyclient');
    });
    await use(context);
    expect(violations, 'E2E attempted an operation outside the approved cast scope').toEqual([]);
  }
});
