import {
  accountRedirectUrl,
  getSupabaseClient,
  getSupabaseConfiguration
} from "./supabase-client.js";

const root = document.querySelector("[data-account-root]");

if (root) {
  initializeAccount(root);
}


function readPathwayCatalog() {
  const element = document.getElementById("cc-pathway-catalog-data");

  try {
    const parsed = JSON.parse(element ? element.textContent : "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}


function setHidden(element, hidden) {
  if (element) {
    element.hidden = hidden;
  }
}


function setFormBusy(form, busy) {
  form.querySelectorAll("button, input, textarea").forEach(function (control) {
    control.disabled = busy;
  });

  form.setAttribute("aria-busy", String(busy));
}


function safeContentUrl(value) {
  try {
    const url = new URL(String(value || "/"), window.location.origin);

    if (url.origin !== window.location.origin) {
      return "/";
    }

    return url.pathname + url.search + url.hash;
  } catch (error) {
    return "/";
  }
}


function readableDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}


function initializeAccount(accountRoot) {
  const guest = accountRoot.querySelector("[data-auth-guest]");
  const dashboard = accountRoot.querySelector("[data-auth-user]");
  const unconfigured = accountRoot.querySelector("[data-account-unconfigured]");
  const message = accountRoot.querySelector("[data-account-message]");
  const configuration = getSupabaseConfiguration();
  const catalog = readPathwayCatalog();
  let client;
  let currentSession;
  let recoveryMode = new URLSearchParams(window.location.search).get("mode") === "recovery";
  let renderSequence = 0;

  function announce(text, type) {
    message.textContent = text;
    message.dataset.messageType = type || "info";
    message.hidden = !text;
  }

  function showGuest() {
    setHidden(guest, false);
    setHidden(dashboard, true);
    accountRoot.querySelectorAll(
      "[data-dashboard-pathways], [data-dashboard-bookmarks], [data-dashboard-notes]"
    ).forEach(function (container) {
      container.replaceChildren();
    });
    accountRoot.querySelectorAll(
      "[data-stat-active-pathways], [data-stat-complete-pathways], "
        + "[data-stat-bookmarks], [data-stat-notes]"
    ).forEach(function (stat) {
      stat.textContent = "—";
    });
    accountRoot.querySelector("[data-profile-form]").reset();
    accountRoot.querySelector("[data-learner-name]").textContent = "Learner";
    accountRoot.querySelector("[data-learner-email]").textContent = "";
  }

  function isCurrentUser(user) {
    return Boolean(
      currentSession
        && currentSession.user
        && currentSession.user.id === user.id
    );
  }

  async function loadProfile(user) {
    const form = accountRoot.querySelector("[data-profile-form]");
    const displayName = form.elements.display_name;
    const timezone = form.elements.timezone;
    const userMeta = user.user_metadata || {};
    const fallbackName = userMeta.display_name
      || userMeta.full_name
      || userMeta.name
      || (user.email || "Learner").split("@")[0]
      || "Learner";
    const fallbackTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const response = await client
      .from("learner_profiles")
      .select("display_name,timezone")
      .eq("user_id", user.id)
      .maybeSingle();

    if (response.error) {
      throw response.error;
    }

    let profile = response.data;

    if (!profile) {
      const created = await client
        .from("learner_profiles")
        .upsert({
          user_id: user.id,
          display_name: fallbackName,
          timezone: fallbackTimezone
        }, { onConflict: "user_id" })
        .select("display_name,timezone")
        .single();

      if (created.error) {
        throw created.error;
      }

      profile = created.data;
    }

    if (!isCurrentUser(user)) {
      return;
    }

    displayName.value = profile.display_name;
    timezone.value = profile.timezone;
    accountRoot.querySelector("[data-learner-name]").textContent = profile.display_name;
    accountRoot.querySelector("[data-learner-email]").textContent = user.email || "";
  }

  function createPathwayRow(pathway, enrollment, completedCount) {
    const article = document.createElement("article");
    const heading = document.createElement("h4");
    const link = document.createElement("a");
    const progressLine = document.createElement("div");
    const progressTrack = document.createElement("div");
    const progressBar = document.createElement("span");
    const total = pathway.totalSteps || (enrollment && enrollment.total_steps) || 0;
    const count = Math.min(completedCount || 0, total);
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    article.className = "cc-dashboard-pathway";
    link.href = pathway.url;
    link.textContent = pathway.title;
    heading.appendChild(link);

    progressLine.className = "cc-pathway-progress-line";
    progressLine.appendChild(document.createTextNode(count + " of " + total + " steps"));
    const percentage = document.createElement("span");
    percentage.textContent = percent + "%";
    progressLine.appendChild(percentage);

    progressTrack.className = "cc-pathway-progress-track";
    progressTrack.setAttribute("role", "progressbar");
    progressTrack.setAttribute("aria-label", "Progress for " + pathway.title);
    progressTrack.setAttribute("aria-valuemin", "0");
    progressTrack.setAttribute("aria-valuemax", String(total));
    progressTrack.setAttribute("aria-valuenow", String(count));
    progressBar.style.width = percent + "%";
    progressTrack.appendChild(progressBar);

    article.appendChild(heading);
    article.appendChild(progressLine);
    article.appendChild(progressTrack);

    return article;
  }

  async function loadProgress(user) {
    const container = accountRoot.querySelector("[data-dashboard-pathways]");
    const summary = accountRoot.querySelector("[data-sync-summary]");
    const [pathwaysResponse, progressResponse] = await Promise.all([
      client
        .from("learner_pathways")
        .select("pathway_slug,total_steps,last_activity_at,completed_at")
        .eq("user_id", user.id),
      client
        .from("learner_progress")
        .select("pathway_slug,item_key")
        .eq("user_id", user.id)
    ]);

    if (pathwaysResponse.error) {
      throw pathwaysResponse.error;
    }

    if (progressResponse.error) {
      throw progressResponse.error;
    }

    const enrollments = new Map(
      pathwaysResponse.data.map(function (pathway) {
        return [pathway.pathway_slug, pathway];
      })
    );
    const counts = progressResponse.data.reduce(function (result, item) {
      result[item.pathway_slug] = (result[item.pathway_slug] || 0) + 1;
      return result;
    }, {});
    const activePathways = catalog.filter(function (pathway) {
      return enrollments.has(pathway.slug) || counts[pathway.slug];
    });

    if (!isCurrentUser(user)) {
      return;
    }

    container.replaceChildren();

    if (!activePathways.length) {
      const empty = document.createElement("p");
      empty.className = "cc-dashboard-empty";
      empty.textContent = "No synchronized pathway progress yet. Open a pathway and complete a step to begin.";
      container.appendChild(empty);
    } else {
      activePathways.forEach(function (pathway) {
        container.appendChild(
          createPathwayRow(
            pathway,
            enrollments.get(pathway.slug),
            counts[pathway.slug] || 0
          )
        );
      });
    }

    const completedPathways = pathwaysResponse.data.filter(function (pathway) {
      return Boolean(pathway.completed_at);
    }).length;
    const inProgressPathways = Math.max(activePathways.length - completedPathways, 0);
    summary.textContent = inProgressPathways + " active · "
      + completedPathways + " complete";
    accountRoot.querySelector("[data-stat-active-pathways]").textContent = String(inProgressPathways);
    accountRoot.querySelector("[data-stat-complete-pathways]").textContent = String(completedPathways);
  }

  function createSavedItemHeader(record, dateValue, actionLabel, onAction) {
    const header = document.createElement("header");
    const details = document.createElement("div");
    const meta = document.createElement("div");
    const heading = document.createElement("h5");
    const link = document.createElement("a");
    const action = document.createElement("button");
    const date = readableDate(dateValue);

    meta.className = "cc-dashboard-saved-meta";
    meta.textContent = record.content_type + (date ? " · " + date : "");
    link.href = safeContentUrl(record.content_url);
    link.textContent = record.content_title;
    heading.appendChild(link);
    details.appendChild(meta);
    details.appendChild(heading);

    action.className = "cc-dashboard-remove";
    action.type = "button";
    action.textContent = actionLabel;
    action.addEventListener("click", function () {
      onAction(action);
    });

    header.appendChild(details);
    header.appendChild(action);
    return header;
  }

  function createEmptySavedState(messageText) {
    const empty = document.createElement("p");
    empty.className = "cc-dashboard-empty";
    empty.textContent = messageText;
    return empty;
  }

  async function refreshSavedMaterial() {
    if (!currentSession) {
      return;
    }

    await loadSavedMaterial(currentSession.user);
  }

  function createBookmarkRow(record) {
    const article = document.createElement("article");
    article.className = "cc-dashboard-saved-item";
    article.appendChild(
      createSavedItemHeader(record, record.bookmarked_at, "Remove", async function (button) {
        if (!currentSession) {
          return;
        }

        const userId = currentSession.user.id;
        button.disabled = true;
        const response = await client
          .from("learner_bookmarks")
          .delete()
          .eq("user_id", userId)
          .eq("content_key", record.content_key);

        if (response.error) {
          button.disabled = false;
          announce("The bookmark could not be removed. Please try again.", "error");
          return;
        }

        announce("Bookmark removed.", "success");
        await refreshSavedMaterial();
      })
    );
    return article;
  }

  function createNoteRow(record) {
    const article = document.createElement("article");
    const textarea = document.createElement("textarea");
    const actions = document.createElement("div");
    const counter = document.createElement("small");
    const save = document.createElement("button");

    article.className = "cc-dashboard-saved-item";
    article.appendChild(
      createSavedItemHeader(record, record.updated_at, "Delete", async function (button) {
        if (!currentSession) {
          return;
        }

        if (!window.confirm("Delete this private note?")) {
          return;
        }

        const userId = currentSession.user.id;
        button.disabled = true;
        const response = await client
          .from("learner_notes")
          .delete()
          .eq("user_id", userId)
          .eq("content_key", record.content_key);

        if (response.error) {
          button.disabled = false;
          announce("The private note could not be deleted. Please try again.", "error");
          return;
        }

        announce("Private note deleted.", "success");
        await refreshSavedMaterial();
      })
    );

    textarea.className = "cc-dashboard-note-text";
    textarea.value = record.note_body;
    textarea.maxLength = 10000;
    textarea.setAttribute("aria-label", "Private note for " + record.content_title);

    function updateCounter() {
      counter.textContent = textarea.value.length.toLocaleString() + " / 10,000";
    }

    textarea.addEventListener("input", updateCounter);
    updateCounter();

    actions.className = "cc-dashboard-note-actions";
    save.type = "button";
    save.textContent = "Save changes";
    save.addEventListener("click", async function () {
      if (!currentSession) {
        return;
      }

      const noteBody = textarea.value.trim();

      if (!noteBody) {
        announce("A private note cannot be empty. Delete it if you no longer need it.", "error");
        textarea.focus();
        return;
      }

      const userId = currentSession.user.id;
      setFormBusy(article, true);
      const response = await client
        .from("learner_notes")
        .update({ note_body: noteBody })
        .eq("user_id", userId)
        .eq("content_key", record.content_key);
      setFormBusy(article, false);

      if (response.error) {
        announce("The private note could not be saved. Please try again.", "error");
        return;
      }

      textarea.value = noteBody;
      updateCounter();
      announce("Private note saved.", "success");
    });

    actions.appendChild(counter);
    actions.appendChild(save);
    article.appendChild(textarea);
    article.appendChild(actions);
    return article;
  }

  async function loadSavedMaterial(user) {
    const bookmarksContainer = accountRoot.querySelector("[data-dashboard-bookmarks]");
    const notesContainer = accountRoot.querySelector("[data-dashboard-notes]");
    const [bookmarksResponse, notesResponse] = await Promise.all([
      client
        .from("learner_bookmarks")
        .select("content_key,content_url,content_title,content_type,bookmarked_at")
        .eq("user_id", user.id)
        .order("bookmarked_at", { ascending: false })
        .limit(100),
      client
        .from("learner_notes")
        .select("content_key,content_url,content_title,content_type,note_body,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100)
    ]);

    if (bookmarksResponse.error) {
      throw bookmarksResponse.error;
    }

    if (notesResponse.error) {
      throw notesResponse.error;
    }

    const bookmarks = bookmarksResponse.data || [];
    const notes = notesResponse.data || [];

    if (!isCurrentUser(user)) {
      return;
    }

    bookmarksContainer.replaceChildren();
    notesContainer.replaceChildren();

    if (bookmarks.length) {
      bookmarks.forEach(function (bookmark) {
        bookmarksContainer.appendChild(createBookmarkRow(bookmark));
      });
    } else {
      bookmarksContainer.appendChild(
        createEmptySavedState("No bookmarks yet. Save material from any article, pathway, topic, thinker, or source page.")
      );
    }

    if (notes.length) {
      notes.forEach(function (note) {
        notesContainer.appendChild(createNoteRow(note));
      });
    } else {
      notesContainer.appendChild(
        createEmptySavedState("No private notes yet. Open the study tools on a content page to begin your notebook.")
      );
    }

    accountRoot.querySelector("[data-bookmark-summary]").textContent = bookmarks.length
      + (bookmarks.length === 1 ? " item" : " items");
    accountRoot.querySelector("[data-note-summary]").textContent = notes.length
      + (notes.length === 1 ? " note" : " notes");
    accountRoot.querySelector("[data-stat-bookmarks]").textContent = String(bookmarks.length);
    accountRoot.querySelector("[data-stat-notes]").textContent = String(notes.length);
  }

  async function showDashboard(session) {
    const sequence = ++renderSequence;
    currentSession = session;
    setHidden(guest, true);
    setHidden(dashboard, false);
    setHidden(
      accountRoot.querySelector("[data-password-update-form]"),
      !recoveryMode
    );

    try {
      await Promise.all([
        loadProfile(session.user),
        loadProgress(session.user),
        loadSavedMaterial(session.user)
      ]);

      if (sequence !== renderSequence) {
        return;
      }
    } catch (error) {
      announce(
        "Your account is signed in, but learner data could not be loaded. "
          + "Confirm that the learner database migrations have been applied.",
        "error"
      );
    }
  }

  async function renderSession(session) {
    if (session && session.user) {
      await showDashboard(session);
    } else {
      currentSession = null;
      renderSequence += 1;
      showGuest();
    }
  }

  async function begin() {
    if (configuration.issue) {
      setHidden(unconfigured, false);
      setHidden(guest, true);
      setHidden(dashboard, true);
      return;
    }

    try {
      client = await getSupabaseClient();
      const result = await client.auth.getSession();

      if (result.error) {
        throw result.error;
      }

      await renderSession(result.data.session);

      client.auth.onAuthStateChange(function (event, session) {
        if (event === "PASSWORD_RECOVERY") {
          recoveryMode = true;
        }

        window.setTimeout(function () {
          renderSession(session);
        }, 0);
      });

      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const oauthError = searchParams.get("error_description") || hashParams.get("error_description")
        || searchParams.get("error") || hashParams.get("error");

      if (oauthError && !result.data.session) {
        announce(decodeURIComponent(oauthError).replace(/\+/g, " "), "error");
      }

      const returnTo = safeContentUrl(searchParams.get("return_to"));
      if (result.data.session && returnTo && returnTo !== "/" && returnTo !== "/account/") {
        window.location.replace(returnTo);
        return;
      }
    } catch (error) {
      setHidden(unconfigured, false);
      setHidden(guest, true);
      announce("The account service could not be reached. Please try again later.", "error");
    }
  }

  accountRoot.querySelectorAll("[data-google-auth]").forEach(function (button) {
    button.addEventListener("click", async function (event) {
      event.preventDefault();

      if (!client) {
        announce("The account service is initializing. Please try again in a moment.", "info");
        return;
      }

      const allGoogleButtons = accountRoot.querySelectorAll("[data-google-auth]");
      allGoogleButtons.forEach(function (btn) {
        btn.disabled = true;
      });
      announce("Redirecting to Google…", "info");

      const returnTo = safeContentUrl(new URLSearchParams(window.location.search).get("return_to"));
      const redirectParams = returnTo && returnTo !== "/" && returnTo !== "/account/" ? { return_to: returnTo } : {};

      try {
        const response = await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: accountRedirectUrl(redirectParams)
          }
        });

        if (response.error) {
          allGoogleButtons.forEach(function (btn) {
            btn.disabled = false;
          });
          announce(response.error.message, "error");
        }
      } catch (error) {
        allGoogleButtons.forEach(function (btn) {
          btn.disabled = false;
        });
        announce(
          error && error.message ? error.message : "Google sign-in could not be initiated.",
          "error"
        );
      }
    });
  });

  accountRoot.querySelector("[data-sign-in-form]").addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setFormBusy(form, true);
    announce("Signing in…", "info");

    const response = await client.auth.signInWithPassword({
      email: String(values.get("email") || "").trim(),
      password: String(values.get("password") || "")
    });

    setFormBusy(form, false);

    if (response.error) {
      announce(response.error.message, "error");
      return;
    }

    form.reset();
    const returnTo = safeContentUrl(new URLSearchParams(window.location.search).get("return_to"));
    if (returnTo && returnTo !== "/" && returnTo !== "/account/") {
      announce("Signed in. Redirecting to your reading…", "success");
      window.setTimeout(function () {
        window.location.assign(returnTo);
      }, 350);
      return;
    }

    announce("Signed in. Your progress, bookmarks, and notes are synchronized.", "success");
  });

  accountRoot.querySelector("[data-sign-up-form]").addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const displayName = String(values.get("display_name") || "").trim();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setFormBusy(form, true);
    announce("Creating your account…", "info");

    const response = await client.auth.signUp({
      email: String(values.get("email") || "").trim(),
      password: String(values.get("password") || ""),
      options: {
        emailRedirectTo: accountRedirectUrl({ confirmed: "1" }),
        data: { display_name: displayName, timezone: timezone }
      }
    });

    setFormBusy(form, false);

    if (response.error) {
      announce(response.error.message, "error");
      return;
    }

    form.reset();
    const returnTo = safeContentUrl(new URLSearchParams(window.location.search).get("return_to"));
    if (response.data.session && returnTo && returnTo !== "/" && returnTo !== "/account/") {
      announce("Account created. Redirecting to your reading…", "success");
      window.setTimeout(function () {
        window.location.assign(returnTo);
      }, 350);
      return;
    }
    announce(
      response.data.session
        ? "Account created. Your learner dashboard is ready."
        : "Check your email to confirm the account, then return here to sign in.",
      "success"
    );
  });

  const resetForm = accountRoot.querySelector("[data-reset-request-form]");

  accountRoot.querySelector("[data-show-reset]").addEventListener("click", function () {
    setHidden(resetForm, false);
    resetForm.querySelector("input").focus();
  });

  accountRoot.querySelector("[data-hide-reset]").addEventListener("click", function () {
    setHidden(resetForm, true);
  });

  resetForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setFormBusy(form, true);

    const response = await client.auth.resetPasswordForEmail(
      String(values.get("email") || "").trim(),
      { redirectTo: accountRedirectUrl({ mode: "recovery" }) }
    );

    setFormBusy(form, false);

    if (response.error) {
      announce(response.error.message, "error");
      return;
    }

    form.reset();
    setHidden(form, true);
    announce("If that address has an account, a recovery email is on its way.", "success");
  });

  accountRoot.querySelector("[data-sign-out]").addEventListener("click", async function (event) {
    event.currentTarget.disabled = true;
    const response = await client.auth.signOut();
    event.currentTarget.disabled = false;

    if (response.error) {
      announce(response.error.message, "error");
      return;
    }

    announce("Signed out. New pathway progress will remain in this browser.", "success");
  });

  accountRoot.querySelector("[data-profile-form]").addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!currentSession) {
      return;
    }

    const form = event.currentTarget;
    const values = new FormData(form);
    const displayName = String(values.get("display_name") || "").trim();
    const timezone = String(values.get("timezone") || "").trim();
    setFormBusy(form, true);

    const response = await client
      .from("learner_profiles")
      .upsert({
        user_id: currentSession.user.id,
        display_name: displayName,
        timezone: timezone
      }, { onConflict: "user_id" });

    setFormBusy(form, false);

    if (response.error) {
      announce(response.error.message, "error");
      return;
    }

    accountRoot.querySelector("[data-learner-name]").textContent = displayName;
    announce("Profile saved.", "success");
  });

  accountRoot.querySelector("[data-password-update-form]").addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setFormBusy(form, true);

    const response = await client.auth.updateUser({
      password: String(values.get("password") || "")
    });

    setFormBusy(form, false);

    if (response.error) {
      announce(response.error.message, "error");
      return;
    }

    recoveryMode = false;
    form.reset();
    setHidden(form, true);
    window.history.replaceState({}, "", "/account/");
    announce("Your password has been updated.", "success");
  });

  window.addEventListener("cc:learning-progress-synced", function () {
    if (!currentSession) {
      return;
    }

    loadProgress(currentSession.user).catch(function () {
      announce("Progress synchronized, but the dashboard could not refresh.", "error");
    });
  });

  begin();
}
