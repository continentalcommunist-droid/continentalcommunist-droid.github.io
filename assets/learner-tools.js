import {
  getSupabaseClient,
  getSupabaseConfiguration
} from "./supabase-client.js";

const root = document.querySelector("[data-learner-tools]");

if (root) {
  initializeLearnerTools(root);
}


function setHidden(element, hidden) {
  if (element) {
    element.hidden = hidden;
  }
}


function setBusy(container, busy) {
  container.querySelectorAll("button, textarea").forEach(function (control) {
    control.disabled = busy;
  });
  container.setAttribute("aria-busy", String(busy));
}


function initializeLearnerTools(toolRoot) {
  const configuration = getSupabaseConfiguration();
  const userControls = toolRoot.querySelector("[data-learner-tools-user]");
  const guestMessage = toolRoot.querySelector("[data-learner-tools-guest]");
  const dashboardLink = toolRoot.querySelector("[data-learner-tools-dashboard]");
  const bookmarkButton = toolRoot.querySelector("[data-bookmark-toggle]");
  const bookmarkLabel = toolRoot.querySelector("[data-bookmark-label]");
  const noteToggle = toolRoot.querySelector("[data-note-toggle]");
  const noteToggleLabel = toolRoot.querySelector("[data-note-toggle-label]");
  const noteForm = toolRoot.querySelector("[data-note-form]");
  const noteBody = noteForm.elements.note_body;
  const noteCount = toolRoot.querySelector("[data-note-count]");
  const noteDelete = toolRoot.querySelector("[data-note-delete]");
  const status = toolRoot.querySelector("[data-learner-tool-status]");
  const content = {
    content_key: String(toolRoot.dataset.contentKey || "").slice(0, 320),
    content_url: String(toolRoot.dataset.contentUrl || "/").slice(0, 500),
    content_title: String(toolRoot.dataset.contentTitle || "Untitled").slice(0, 240),
    content_type: String(toolRoot.dataset.contentType || "Page").slice(0, 80)
  };
  let client;
  let session;
  let bookmarked = false;
  let hasNote = false;
  let sessionSequence = 0;

  function announce(text, type) {
    status.textContent = text;
    status.dataset.messageType = type || "info";
  }

  function renderBookmark() {
    bookmarkButton.setAttribute("aria-pressed", String(bookmarked));
    bookmarkButton.classList.toggle("is-saved", bookmarked);
    bookmarkLabel.textContent = bookmarked ? "Bookmarked" : "Save bookmark";
  }

  function renderNote() {
    noteToggleLabel.textContent = hasNote ? "Edit private note" : "Add private note";
    setHidden(noteDelete, !hasNote);
    noteCount.textContent = noteBody.value.length.toLocaleString() + " / 10,000";
  }

  function showSignedOut() {
    session = null;
    bookmarked = false;
    hasNote = false;
    noteBody.value = "";
    setHidden(userControls, true);
    setHidden(dashboardLink, true);
    setHidden(guestMessage, false);
    setHidden(noteForm, true);
    noteToggle.setAttribute("aria-expanded", "false");
    renderBookmark();
    renderNote();
    announce("", "info");
  }

  async function loadSavedState(user, sequence) {
    const [bookmarkResponse, noteResponse] = await Promise.all([
      client
        .from("learner_bookmarks")
        .select("content_key")
        .eq("user_id", user.id)
        .eq("content_key", content.content_key)
        .maybeSingle(),
      client
        .from("learner_notes")
        .select("note_body")
        .eq("user_id", user.id)
        .eq("content_key", content.content_key)
        .maybeSingle()
    ]);

    if (bookmarkResponse.error) {
      throw bookmarkResponse.error;
    }

    if (noteResponse.error) {
      throw noteResponse.error;
    }

    if (sequence !== sessionSequence) {
      return;
    }

    bookmarked = Boolean(bookmarkResponse.data);
    hasNote = Boolean(noteResponse.data);
    noteBody.value = noteResponse.data ? noteResponse.data.note_body : "";
    renderBookmark();
    renderNote();
  }

  async function showSignedIn(nextSession) {
    const sequence = ++sessionSequence;
    session = nextSession;
    setHidden(guestMessage, true);
    setHidden(userControls, false);
    setHidden(dashboardLink, false);
    setBusy(userControls, true);
    announce("Loading your saved study material…", "info");

    try {
      await loadSavedState(nextSession.user, sequence);

      if (sequence === sessionSequence) {
        announce("", "info");
      }
    } catch (error) {
      announce("Your private study tools could not be loaded. Please try again.", "error");
    } finally {
      if (sequence === sessionSequence) {
        setBusy(userControls, false);
      }
    }
  }

  async function renderSession(nextSession) {
    if (nextSession && nextSession.user) {
      await showSignedIn(nextSession);
    } else {
      sessionSequence += 1;
      showSignedOut();
    }
  }

  bookmarkButton.addEventListener("click", async function () {
    if (!session) {
      return;
    }

    bookmarkButton.disabled = true;
    const wasBookmarked = bookmarked;
    let response;

    if (wasBookmarked) {
      response = await client
        .from("learner_bookmarks")
        .delete()
        .eq("user_id", session.user.id)
        .eq("content_key", content.content_key);
    } else {
      response = await client
        .from("learner_bookmarks")
        .upsert({
          user_id: session.user.id,
          ...content,
          bookmarked_at: new Date().toISOString()
        }, { onConflict: "user_id,content_key" });
    }

    bookmarkButton.disabled = false;

    if (response.error) {
      announce("The bookmark could not be updated. Please try again.", "error");
      return;
    }

    bookmarked = !wasBookmarked;
    renderBookmark();
    announce(bookmarked ? "Bookmark saved." : "Bookmark removed.", "success");
  });

  noteToggle.addEventListener("click", function () {
    const willOpen = noteForm.hidden;
    setHidden(noteForm, !willOpen);
    noteToggle.setAttribute("aria-expanded", String(willOpen));

    if (willOpen) {
      noteBody.focus();
    }
  });

  noteBody.addEventListener("input", renderNote);

  noteForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const body = noteBody.value.trim();

    if (!body) {
      announce("Write something before saving the note.", "error");
      noteBody.focus();
      return;
    }

    setBusy(noteForm, true);
    const response = await client
      .from("learner_notes")
      .upsert({
        user_id: session.user.id,
        ...content,
        note_body: body
      }, { onConflict: "user_id,content_key" });
    setBusy(noteForm, false);

    if (response.error) {
      announce("The private note could not be saved. Please try again.", "error");
      return;
    }

    noteBody.value = body;
    hasNote = true;
    renderNote();
    announce("Private note saved.", "success");
  });

  noteDelete.addEventListener("click", async function () {
    if (!session || !hasNote) {
      return;
    }

    if (!window.confirm("Delete your private note for this page?")) {
      return;
    }

    setBusy(noteForm, true);
    const response = await client
      .from("learner_notes")
      .delete()
      .eq("user_id", session.user.id)
      .eq("content_key", content.content_key);
    setBusy(noteForm, false);

    if (response.error) {
      announce("The private note could not be deleted. Please try again.", "error");
      return;
    }

    hasNote = false;
    noteBody.value = "";
    renderNote();
    announce("Private note deleted.", "success");
  });

  async function begin() {
    if (configuration.issue) {
      announce("Private study tools are temporarily unavailable.", "error");
      return;
    }

    try {
      client = await getSupabaseClient();
      const result = await client.auth.getSession();

      if (result.error) {
        throw result.error;
      }

      await renderSession(result.data.session);

      client.auth.onAuthStateChange(function (event, nextSession) {
        window.setTimeout(function () {
          renderSession(nextSession);
        }, 0);
      });
    } catch (error) {
      announce("Private study tools are temporarily unavailable.", "error");
    }
  }

  renderBookmark();
  renderNote();
  begin();
}
