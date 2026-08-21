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
 */
const hasDocument = typeof document !== "undefined";
const hasLocation = typeof location !== "undefined";
const isPublicCastView = (hasDocument && document.body?.dataset.page === "cast.html")
  || (hasLocation && /(?:^|\/)cast\.html$/.test(location.pathname));
const publicReadCache = new Map();
const WRITE_METHODS = new Set(["insert", "update", "upsert", "delete"]);

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

export const supabase = isPublicCastView
  ? new Proxy(rawSupabase, {
      get(target, property, receiver) {
        if (property !== "from") return Reflect.get(target, property, receiver);
        return table => wrapReadBuilder(
          target.from(table),
          [`from(${serializeArgument(table)})`],
          false
        );
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
