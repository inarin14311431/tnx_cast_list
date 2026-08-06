const PRODUCTION_BASE_PATH = "/tnx_cast_list/";
const currentDirectory = new URL("./", window.location.href).pathname;

export const SITE_BASE_PATH = currentDirectory.endsWith(PRODUCTION_BASE_PATH)
  ? PRODUCTION_BASE_PATH
  : currentDirectory;
