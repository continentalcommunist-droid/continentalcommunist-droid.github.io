import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client.js";

(function () {
  "use strict";

  const ANONYMOUS_STATE_KEY = "continental-communist-learning-progress-v1";
  const USER_STATE_PREFIX = "continental-communist-learning-progress-user-v1:";
  const USER_DIRTY_PREFIX = "continental-communist-learning-dirty-user-v1:";
  let activeUser = null;
  let client = null;
  let state = readObject(ANONYMOUS_STATE_KEY, {});
  let sessionSequence = 0;
  let syncQueue = Promise.resolve();


  function readObject(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      const parsed = value ? JSON.parse(value) : fallback;

      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  }


  function writeObject(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* The current page remains usable when browser storage is unavailable. */
    }
  }


  function removeObject(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      /* Nothing else is required when storage is unavailable. */
    }
  }


  function userStateKey(userId) {
    return USER_STATE_PREFIX + userId;
  }


  function userDirtyKey(userId) {
    return USER_DIRTY_PREFIX + userId;
  }


  function completedFor(currentState, slug) {
    const completed = currentState[slug];

    return Array.isArray(completed) ? completed : [];
  }


  function pathwayCatalog() {
    const element = document.getElementById("cc-pathway-catalog-data");

    try {
      const parsed = JSON.parse(element ? element.textContent : "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }


  const catalogBySlug = new Map(
    pathwayCatalog().map(function (pathway) {
      return [pathway.slug, pathway];
    })
  );


  function totalFor(slug) {
    const catalogEntry = catalogBySlug.get(slug);

    if (catalogEntry) {
      return Number(catalogEntry.totalSteps) || 0;
    }

    const escapedSlug = window.CSS && window.CSS.escape
      ? window.CSS.escape(slug)
      : slug.replace(/[^a-z0-9_-]/gi, "");
    const root = document.querySelector(
      '[data-learning-path="' + escapedSlug + '"], '
        + '[data-pathway-card="' + escapedSlug + '"]'
    );

    return root ? Number(root.getAttribute("data-total-steps")) || 0 : 0;
  }


  function persistActiveState() {
    writeObject(
      activeUser ? userStateKey(activeUser.id) : ANONYMOUS_STATE_KEY,
      state
    );
  }


  function updateProgress(root, completedCount) {
    const total = Number(root.getAttribute("data-total-steps")) || 0;
    const safeCount = Math.min(completedCount, total);
    const percent = total > 0
      ? Math.round((safeCount / total) * 100)
      : 0;

    root.querySelectorAll("[data-progress-count]").forEach(function (element) {
      element.textContent = safeCount + " of " + total + " steps";
    });

    root.querySelectorAll("[data-progress-percent]").forEach(function (element) {
      element.textContent = percent + "%";
    });

    root.querySelectorAll("[data-progress-bar]").forEach(function (element) {
      element.style.width = percent + "%";
    });

    root.querySelectorAll('[role="progressbar"]').forEach(function (element) {
      element.setAttribute("aria-valuenow", String(safeCount));
      element.setAttribute("aria-valuetext", percent + "% complete");
    });
  }


  function renderProgress() {
    document.querySelectorAll("[data-learning-path]").forEach(function (root) {
      const slug = root.getAttribute("data-learning-path");
      const completed = new Set(completedFor(state, slug));

      root.querySelectorAll("[data-progress-item]").forEach(function (checkbox) {
        checkbox.checked = completed.has(
          checkbox.getAttribute("data-progress-item")
        );
      });

      updateProgress(root, completed.size);
    });

    document.querySelectorAll("[data-pathway-card]").forEach(function (card) {
      const slug = card.getAttribute("data-pathway-card");
      updateProgress(card, completedFor(state, slug).length);
    });
  }


  function showStorageState(mode, message) {
    document.querySelectorAll("[data-progress-storage]").forEach(function (element) {
      element.textContent = message;
      element.dataset.syncState = mode;
    });

    document.querySelectorAll("[data-progress-account-link]").forEach(function (link) {
      link.textContent = activeUser ? "View my learning" : "Sign in to sync";
    });
  }


  function readDirty(userId) {
    const value = readObject(userDirtyKey(userId), { revision: 0, paths: {} });

    if (!value.paths || typeof value.paths !== "object") {
      return { revision: 0, paths: {} };
    }

    return value;
  }


  function updateDirty(userId, callback) {
    const dirty = readDirty(userId);
    dirty.revision = Number(dirty.revision || 0) + 1;
    callback(dirty.paths);
    writeObject(userDirtyKey(userId), dirty);
  }


  function markItemDirty(userId, slug, item, completed) {
    updateDirty(userId, function (paths) {
      paths[slug] = paths[slug] || { reset: false, items: {} };
      paths[slug].items[item] = completed;
    });
  }


  function markPathReset(userId, slug) {
    updateDirty(userId, function (paths) {
      paths[slug] = { reset: true, items: {} };
    });
  }


  async function upsertPathway(userId, slug, sourceState) {
    const total = totalFor(slug);
    const completedCount = completedFor(sourceState, slug).length;
    const timestamp = new Date().toISOString();
    const response = await client
      .from("learner_pathways")
      .upsert({
        user_id: userId,
        pathway_slug: slug,
        total_steps: total,
        last_activity_at: timestamp,
        completed_at: total > 0 && completedCount >= total ? timestamp : null
      }, { onConflict: "user_id,pathway_slug" });

    if (response.error) {
      throw response.error;
    }
  }


  async function pushDirty(userId) {
    const snapshot = readDirty(userId);
    const sourceState = readObject(userStateKey(userId), {});
    const slugs = Object.keys(snapshot.paths);

    if (!slugs.length) {
      return;
    }

    for (const slug of slugs) {
      const mutation = snapshot.paths[slug];
      const items = mutation.items || {};
      const completedItems = Object.keys(items).filter(function (item) {
        return items[item] === true;
      });
      const incompleteItems = Object.keys(items).filter(function (item) {
        return items[item] === false;
      });

      await upsertPathway(userId, slug, sourceState);

      if (mutation.reset) {
        const resetResponse = await client
          .from("learner_progress")
          .delete()
          .eq("user_id", userId)
          .eq("pathway_slug", slug);

        if (resetResponse.error) {
          throw resetResponse.error;
        }
      }

      if (completedItems.length) {
        const rows = completedItems.map(function (item) {
          return {
            user_id: userId,
            pathway_slug: slug,
            item_key: item,
            completed_at: new Date().toISOString()
          };
        });
        const completeResponse = await client
          .from("learner_progress")
          .upsert(rows, { onConflict: "user_id,pathway_slug,item_key" });

        if (completeResponse.error) {
          throw completeResponse.error;
        }
      }

      if (incompleteItems.length) {
        const incompleteResponse = await client
          .from("learner_progress")
          .delete()
          .eq("user_id", userId)
          .eq("pathway_slug", slug)
          .in("item_key", incompleteItems);

        if (incompleteResponse.error) {
          throw incompleteResponse.error;
        }
      }
    }

    const latest = readDirty(userId);

    if (Number(latest.revision) === Number(snapshot.revision)) {
      removeObject(userDirtyKey(userId));
    }
  }


  async function migrateAnonymousProgress(userId) {
    const anonymousState = readObject(ANONYMOUS_STATE_KEY, {});
    const slugs = Object.keys(anonymousState).filter(function (slug) {
      return completedFor(anonymousState, slug).length > 0;
    });

    for (const slug of slugs) {
      await upsertPathway(userId, slug, anonymousState);
      const rows = completedFor(anonymousState, slug).map(function (item) {
        return {
          user_id: userId,
          pathway_slug: slug,
          item_key: item,
          completed_at: new Date().toISOString()
        };
      });
      const response = await client
        .from("learner_progress")
        .upsert(rows, { onConflict: "user_id,pathway_slug,item_key" });

      if (response.error) {
        throw response.error;
      }
    }

    if (slugs.length) {
      writeObject(ANONYMOUS_STATE_KEY, {});
    }
  }


  async function loadRemoteState(userId) {
    const response = await client
      .from("learner_progress")
      .select("pathway_slug,item_key")
      .eq("user_id", userId);

    if (response.error) {
      throw response.error;
    }

    const remoteState = response.data.reduce(function (result, item) {
      result[item.pathway_slug] = result[item.pathway_slug] || [];
      result[item.pathway_slug].push(item.item_key);
      return result;
    }, {});

    state = remoteState;
    writeObject(userStateKey(userId), state);
    renderProgress();
    window.dispatchEvent(new CustomEvent("cc:learning-progress-synced"));
  }


  function queueSynchronization(userId) {
    syncQueue = syncQueue
      .then(async function () {
        if (!activeUser || activeUser.id !== userId) {
          return;
        }

        showStorageState("syncing", "Synchronizing with your learner account…");
        await pushDirty(userId);
        showStorageState("synced", "Progress synchronized across your devices.");
        window.dispatchEvent(new CustomEvent("cc:learning-progress-synced"));
      })
      .catch(function () {
        showStorageState(
          "error",
          "Saved in this browser; account sync will retry when the service is available."
        );
      });
  }


  function changeProgress(slug, item, completed) {
    const completedItems = new Set(completedFor(state, slug));

    if (completed) {
      completedItems.add(item);
    } else {
      completedItems.delete(item);
    }

    state[slug] = Array.from(completedItems);
    persistActiveState();
    renderProgress();

    if (activeUser) {
      markItemDirty(activeUser.id, slug, item, completed);
      queueSynchronization(activeUser.id);
    } else {
      showStorageState("browser", "Progress saved privately in this browser.");
    }
  }


  function resetProgress(root) {
    const slug = root.getAttribute("data-learning-path");
    const confirmed = window.confirm(
      "Reset all saved progress for this learning pathway?"
    );

    if (!confirmed) {
      return;
    }

    state[slug] = [];
    persistActiveState();
    renderProgress();

    if (activeUser) {
      markPathReset(activeUser.id, slug);
      queueSynchronization(activeUser.id);
    } else {
      showStorageState("browser", "Progress saved privately in this browser.");
    }
  }


  function bindControls() {
    document.querySelectorAll("[data-learning-path]").forEach(function (root) {
      const slug = root.getAttribute("data-learning-path");

      root.querySelectorAll("[data-progress-item]").forEach(function (checkbox) {
        checkbox.addEventListener("change", function () {
          changeProgress(
            slug,
            checkbox.getAttribute("data-progress-item"),
            checkbox.checked
          );
        });
      });

      const resetButton = root.querySelector("[data-reset-path]");

      if (resetButton) {
        resetButton.addEventListener("click", function () {
          resetProgress(root);
        });
      }
    });
  }


  async function activateSession(session) {
    const sequence = ++sessionSequence;

    if (!session || !session.user) {
      activeUser = null;
      state = readObject(ANONYMOUS_STATE_KEY, {});
      renderProgress();
      showStorageState("browser", "Progress saved privately in this browser.");
      return;
    }

    activeUser = session.user;
    state = readObject(userStateKey(activeUser.id), {});
    renderProgress();
    showStorageState("syncing", "Synchronizing with your learner account…");

    try {
      await migrateAnonymousProgress(activeUser.id);
      await pushDirty(activeUser.id);

      if (sequence !== sessionSequence) {
        return;
      }

      await loadRemoteState(activeUser.id);
      showStorageState("synced", "Progress synchronized across your devices.");
    } catch (error) {
      showStorageState(
        "error",
        "Saved in this browser; account sync will retry when the service is available."
      );
    }
  }


  async function initializeSynchronization() {
    if (!isSupabaseConfigured()) {
      showStorageState("browser", "Progress saved privately in this browser.");
      return;
    }

    try {
      client = await getSupabaseClient();
      const result = await client.auth.getSession();

      if (result.error) {
        throw result.error;
      }

      await activateSession(result.data.session);

      client.auth.onAuthStateChange(function (event, session) {
        window.setTimeout(function () {
          activateSession(session);
        }, 0);
      });
    } catch (error) {
      showStorageState(
        "error",
        "Progress is saved in this browser. Account sync is temporarily unavailable."
      );
    }
  }


  bindControls();
  renderProgress();
  initializeSynchronization();

  window.addEventListener("storage", function (event) {
    const expectedKey = activeUser
      ? userStateKey(activeUser.id)
      : ANONYMOUS_STATE_KEY;

    if (event.key !== expectedKey) {
      return;
    }

    state = readObject(expectedKey, {});
    renderProgress();
  });
}());
