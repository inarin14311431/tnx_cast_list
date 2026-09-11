import { createClient } from "./vendor/supabase-js.js";

const SUPABASE_URL = "https://koprmbkoftuuffslhsvt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Dsb9Boo4aP3c_v-Iaam4mw_F1szMdUi";

const rawSupabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

/*
 * Public cast pages are assembled by several read-only presentation modules.
 * Keep their identical SELECT chains on one in-page Promise so modules do not
 * issue the same network request independently. Other pages use the raw client.
 *
 * An unlisted shared URL is a capability URL. Its share token is resolved only
 * through the SECURITY DEFINER RPC; normal table RLS remains public/owner only.
 */
const hasDocument = typeof document !== "undefined";
const hasLocation = typeof location !== "undefined";
const isPublicCastView = (hasDocument && document.body?.dataset.page === "cast.html")
  || (hasLocation && /(?:^|\/)cast\.html$/.test(location.pathname));
const publicReadCache = new Map();
const WRITE_METHODS = new Set(["insert", "update", "upsert", "delete"]);
const SHARED_BUNDLE_KEYS = new Map([
  ["characters", "character"],
  ["character_skills", "skills"],
  ["character_outfits", "outfits"],
  ["character_combos", "combos"],
  ["troops", "troops"]
]);
const castParams = isPublicCastView && hasLocation ? new URLSearchParams(location.search) : null;
const sharedViewToken = castParams?.get("share")?.trim() || "";
const sharedViewPublicId = castParams?.get("id")?.trim() || "";
const hasValidShareToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sharedViewToken);
let sharedBundlePromise = null;

function serializeArgument(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, Object.keys(value || {}).sort());
  } catch {
    return String(value);
  }
}

function wrapReadBuilder(builder, parts = [], writable = false) {
  return new Proxy(builder, {
    get(target, property, receiver) {
      if (property === "then") {
        return (onFulfilled, onRejected) => {
          if (writable) {
            return Promise.resolve(target).then(onFulfilled, onRejected);
          }

          const key = parts.join("|");
          let promise = publicReadCache.get(key);
          if (!promise) {
            promise = Promise.resolve(target);
            publicReadCache.set(key, promise);
          }
          return promise.then(onFulfilled, onRejected);
        };
      }

      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function") return value;

      return (...args) => {
        const next = value.apply(target, args);
        const method = String(property);
        const nextParts = [...parts, `${method}(${args.map(serializeArgument).join(",")})`];
        const nextWritable = writable || WRITE_METHODS.has(method);

        if (next && (typeof next === "object" || typeof next === "function")) {
          return wrapReadBuilder(next, nextParts, nextWritable);
        }
        return next;
      };
    }
  });
}

async function loadSharedBundle() {
  if (!hasValidShareToken) return null;
  if (!sharedBundlePromise) {
    sharedBundlePromise = rawSupabase
      .rpc("get_unlisted_character_bundle", { p_share_token: sharedViewToken })
      .then(({ data, error }) => {
        if (error) throw error;
        if (!data?.character) return null;
        if (sharedViewPublicId && data.character.public_id !== sharedViewPublicId) return null;
        return data;
      });
  }
  return sharedBundlePromise;
}

function resolveSharedRows(bundle, table, state) {
  const key = SHARED_BUNDLE_KEYS.get(table);
  if (!key || !bundle) return null;
  const source = key === "character"
    ? (bundle.character ? [bundle.character] : [])
    : (Array.isArray(bundle[key]) ? bundle[key] : []);
  let rows = source.filter(row => state.filters.every(([column, value]) => row?.[column] === value));
  if (Number.isFinite(state.limit)) rows = rows.slice(0, state.limit);

  if (state.singleMode === "maybe") {
    return { data: rows[0] ?? null, error: rows.length > 1 ? { message: "Multiple rows returned" } : null };
  }
  if (state.singleMode === "single") {
    return rows.length === 1
      ? { data: rows[0], error: null }
      : { data: null, error: { message: "Single row expected" } };
  }
  return { data: rows, error: null };
}

function nextSharedState(state, method, args) {
  const next = {
    filters: [...state.filters],
    limit: state.limit,
    singleMode: state.singleMode
  };
  if (method === "eq") next.filters.push([args[0], args[1]]);
  if (method === "limit") next.limit = Math.max(0, Number(args[0]) || 0);
  if (method === "maybeSingle") next.singleMode = "maybe";
  if (method === "single") next.singleMode = "single";
  return next;
}

function wrapSharedReadBuilder(builder, table, state = { filters: [], limit: null, singleMode: "" }) {
  return new Proxy(builder, {
    get(target, property, receiver) {
      if (property === "then") {
        return async (onFulfilled, onRejected) => {
          try {
            const bundle = await loadSharedBundle();
            const sharedResult = resolveSharedRows(bundle, table, state);
            const result = sharedResult ?? await Promise.resolve(target);
            return onFulfilled ? onFulfilled(result) : result;
          } catch (error) {
            if (onRejected) return onRejected(error);
            throw error;
          }
        };
      }

      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function") return value;
      return (...args) => {
        const next = value.apply(target, args);
        const method = String(property);
        if (next && (typeof next === "object" || typeof next === "function")) {
          return wrapSharedReadBuilder(next, table, nextSharedState(state, method, args));
        }
        return next;
      };
    }
  });
}

export const supabase = isPublicCastView
  ? new Proxy(rawSupabase, {
      get(target, property, receiver) {
        if (property !== "from") return Reflect.get(target, property, receiver);
        return table => {
          const builder = target.from(table);
          if (hasValidShareToken && SHARED_BUNDLE_KEYS.has(table)) {
            return wrapSharedReadBuilder(builder, table);
          }
          return wrapReadBuilder(
            builder,
            [`from(${serializeArgument(table)})`],
            false
          );
        };
      }
    })
  : rawSupabase;

function loadModuleScript(src, id) {
  if (!hasDocument || document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.type = "module";
  script.src = src;
  script.addEventListener("error", () => {
    console.error(`${src} could not be loaded.`);
  }, { once: true });
  document.head.append(script);
}

if (hasDocument && document.querySelector(".cast-content, .sheet-layout")) {
  loadModuleScript("./js/cocofolia-export.js?v=2", "tnx-cocofolia-export-module");
  loadModuleScript("./js/udonarium-export.js?v=1", "tnx-udonarium-export-module");
}