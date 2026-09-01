const CONFIG_ELEMENT_ID = "cc-supabase-config";
const DEFAULT_LIBRARY_VERSION = "2.112.4";
let clientPromise;


function parseConfiguration() {
  const element = document.getElementById(CONFIG_ELEMENT_ID);

  if (!element) {
    return {};
  }

  try {
    return JSON.parse(element.textContent || "{}");
  } catch (error) {
    return {};
  }
}


function decodeLegacyKeyRole(key) {
  if (!key || key.indexOf(".") === -1) {
    return "";
  }

  try {
    const encodedPayload = key.split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padding = "=".repeat((4 - (encodedPayload.length % 4)) % 4);
    const payload = JSON.parse(window.atob(encodedPayload + padding));

    return payload.role || "";
  } catch (error) {
    return "";
  }
}


export function getSupabaseConfiguration() {
  const raw = parseConfiguration();
  const url = String(raw.url || "").trim().replace(/\/$/, "");
  const publishableKey = String(raw.publishableKey || "").trim();
  const libraryVersion = String(
    raw.libraryVersion || DEFAULT_LIBRARY_VERSION
  ).trim();
  let issue = "";

  if (!url || !publishableKey) {
    issue = "Supabase has not been connected yet.";
  } else {
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.protocol !== "https:") {
        issue = "The Supabase URL must use HTTPS.";
      }
    } catch (error) {
      issue = "The Supabase URL is invalid.";
    }
  }

  if (
    publishableKey.startsWith("sb_secret_")
      || decodeLegacyKeyRole(publishableKey) === "service_role"
  ) {
    issue = "A server-only service key cannot be used in the public site.";
  }

  if (!/^\d+\.\d+\.\d+$/.test(libraryVersion)) {
    issue = "The Supabase JavaScript version must be pinned exactly.";
  }

  return { url, publishableKey, libraryVersion, issue };
}


export function isSupabaseConfigured() {
  return !getSupabaseConfiguration().issue;
}


export async function getSupabaseClient() {
  if (clientPromise) {
    return clientPromise;
  }

  const configuration = getSupabaseConfiguration();

  if (configuration.issue) {
    return null;
  }

  clientPromise = import(
    `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${configuration.libraryVersion}/+esm`
  ).then(function (library) {
    return library.createClient(
      configuration.url,
      configuration.publishableKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    );
  });

  return clientPromise;
}


export function accountRedirectUrl(parameters) {
  const url = new URL("/account/", window.location.origin);

  Object.keys(parameters || {}).forEach(function (key) {
    url.searchParams.set(key, parameters[key]);
  });

  return url.toString();
}
