import {
  accountRedirectUrl,
  getSupabaseClient
} from "./supabase-client.js";

(function () {
  "use strict";

  const gatedRoots = document.querySelectorAll("[data-gated-content]");
  if (!gatedRoots.length) {
    return;
  }

  function checkLocalStorageToken() {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
          const val = window.localStorage.getItem(key);
          if (val && val.indexOf("access_token") !== -1) {
            return true;
          }
        }
      }
    } catch (e) {
      /* ignore storage access error */
    }
    return false;
  }

  function setUnlocked(unlocked) {
    gatedRoots.forEach(function (root) {
      root.classList.toggle("is-unlocked", unlocked);
      const gate = root.querySelector("[data-reading-gate]");
      if (gate) {
        gate.hidden = unlocked;
      }
    });

    document.querySelectorAll("[data-gated-evidence], [data-gated-pagination]").forEach(function (el) {
      el.classList.toggle("is-unlocked", unlocked);
      el.hidden = !unlocked;
    });
  }

  if (checkLocalStorageToken()) {
    setUnlocked(true);
  }

  async function init() {
    const client = await getSupabaseClient();
    if (!client) {
      return;
    }

    try {
      const { data } = await client.auth.getSession();
      const isAuthed = Boolean(data && data.session && data.session.user);
      setUnlocked(isAuthed);

      client.auth.onAuthStateChange(function (event, session) {
        setUnlocked(Boolean(session && session.user));
      });
    } catch (e) {
      setUnlocked(false);
    }

    document.querySelectorAll("[data-gate-google-auth]").forEach(function (button) {
      button.addEventListener("click", async function (event) {
        event.preventDefault();
        button.disabled = true;
        const currentPath = window.location.pathname + window.location.search;

        try {
          const response = await client.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: accountRedirectUrl({ return_to: currentPath })
            }
          });

          if (response.error) {
            button.disabled = false;
            console.error("Google sign-in error:", response.error);
          }
        } catch (error) {
          button.disabled = false;
          console.error("Google sign-in error:", error);
        }
      });
    });
  }

  init();
})();
