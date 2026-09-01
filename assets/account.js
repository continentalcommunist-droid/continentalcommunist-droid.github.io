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
  form.querySelectorAll("button, input").forEach(function (control) {
    control.disabled = busy;
  });

  form.setAttribute("aria-busy", String(busy));
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
  }

  async function loadProfile(user) {
    const form = accountRoot.querySelector("[data-profile-form]");
    const displayName = form.elements.display_name;
    const timezone = form.elements.timezone;
    const fallbackName = (user.user_metadata || {}).display_name
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
    summary.textContent = activePathways.length + " active · "
      + completedPathways + " complete";
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
        loadProgress(session.user)
      ]);

      if (sequence !== renderSequence) {
        return;
      }
    } catch (error) {
      announce(
        "Your account is signed in, but learner data could not be loaded. "
          + "Confirm that the database migration has been applied.",
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
    } catch (error) {
      setHidden(unconfigured, false);
      setHidden(guest, true);
      announce("The account service could not be reached. Please try again later.", "error");
    }
  }

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
    announce("Signed in. Your browser progress will synchronize automatically.", "success");
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
    announce(
      response.data.session
        ? "Account created. Your progress can now synchronize."
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

    announce("Signed out. New progress will remain in this browser.", "success");
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
