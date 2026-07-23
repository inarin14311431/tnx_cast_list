import { supabase } from "./supabase-client.js";

const DEPLOYED_FUNCTION_NAME = "smart-service";
const LEGACY_FUNCTION_NAME = "publish-showcase";
const originalInvoke = supabase.functions.invoke.bind(supabase.functions);

supabase.functions.invoke = (functionName, options) =>
  originalInvoke(
    functionName === LEGACY_FUNCTION_NAME
      ? DEPLOYED_FUNCTION_NAME
      : functionName,
    options
  );
