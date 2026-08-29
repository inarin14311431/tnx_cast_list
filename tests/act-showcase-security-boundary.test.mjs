import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const dynamic = await read("supabase/20_dynamic_act_showcase.sql");
const ownerScope = await read("supabase/30_owner_scoped_act_reads.sql");
const client = await read("js/act-showcase.js");

test("public ACT showcase RPC returns only explicitly published showcase data", () => {
  assert.match(dynamic, /create or replace function public\.get_public_act_showcase\(p_slug text\)/i);
  assert.match(dynamic, /security definer/i);
  assert.match(dynamic, /where a\.slug = p_slug[\s\S]*a\.showcase_public = true[\s\S]*a\.showcase_data is not null/i);
  assert.match(dynamic, /revoke all on function public\.get_public_act_showcase\(text\) from public/i);
  assert.match(dynamic, /grant execute on function public\.get_public_act_showcase\(text\) to anon, authenticated/i);
});

test("authenticated ACT history remains owner-scoped rather than globally readable", () => {
  assert.match(ownerScope, /create policy act_participants_select_owner[\s\S]*c\.owner_id\s*=\s*auth\.uid\(\)/i);
  assert.match(ownerScope, /create policy acts_select_owner_scope[\s\S]*published_by\s*=\s*auth\.uid\(\)[\s\S]*c\.owner_id\s*=\s*auth\.uid\(\)/i);
  assert.doesNotMatch(ownerScope, /create policy\s+(?:act_participants_select_authenticated|acts_select_authenticated)[\s\S]*using\s*\(\s*true\s*\)/i);
});

test("public showcase page reads through the public RPC instead of ACT tables", () => {
  assert.match(client, /\/rest\/v1\/rpc\/get_public_act_showcase/);
  assert.match(client, /body:\s*JSON\.stringify\(\{\s*p_slug:\s*slug\s*\}\)/);
  assert.doesNotMatch(client, /\/rest\/v1\/(?:acts|act_participants)(?:\?|["'`])/);
});

test("showcase publication requires authentication and writes only through owned ACT history", () => {
  assert.match(dynamic, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(dynamic, /if v_user_id is null[\s\S]*Authentication is required/i);
  assert.match(dynamic, /record_act_history_for_current_user\(/);
  assert.match(dynamic, /where id = v_act_id[\s\S]*published_by = v_user_id/i);
  assert.match(dynamic, /grant execute on function public\.publish_act_showcase_for_current_user[\s\S]*to authenticated/i);
  assert.doesNotMatch(dynamic, /grant execute on function public\.publish_act_showcase_for_current_user[\s\S]*to anon/i);
});
