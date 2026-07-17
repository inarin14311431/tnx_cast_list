import { supabase } from './supabase-client.js';

const originalFrom = supabase.from.bind(supabase);

supabase.from = function patchedFrom(table) {
  const builder = originalFrom(table);
  if (table !== 'characters') return builder;

  const originalInsert = builder.insert.bind(builder);
  const originalUpdate = builder.update.bind(builder);

  builder.insert = payload => originalInsert(stripUnsupported(payload));
  builder.update = payload => originalUpdate(stripUnsupported(payload));
  return builder;
};

function stripUnsupported(payload) {
  if (Array.isArray(payload)) return payload.map(stripUnsupported);
  if (!payload || typeof payload !== 'object') return payload;
  const clean = { ...payload };
  for (const key of Object.keys(clean)) {
    if (key.endsWith('_style_base') || key.endsWith('_control_style_base')) {
      delete clean[key];
    }
  }
  return clean;
}
