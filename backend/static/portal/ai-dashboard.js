(function () {
  "use strict";

  const cfgEl = document.getElementById("ai-dash-config");
  if (!cfgEl) return;

  const cfg = JSON.parse(cfgEl.textContent || "{}");
  const tbody = document.getElementById("ai-jobs-tbody");
  const panelEmpty = document.getElementById("ai-detail-empty");
  const panelContent = document.getElementById("ai-detail-content");
  const queueBadge = document.getElementById("ai-queue-badge");
  const lastSync = document.getElementById("ai-last-sync");

  let selectedId = cfg.initialFocusId || null;
  let requests = [];
  let repoCache = null;
  let activeDiffFile = null;

  function csrf() {
    const m = document.cookie.match(/csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }

  async function postJson(url) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-CSRFToken": csrf(),
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
      },
    });
    return res.json();
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function stageDot(stage) {
    let cls = "stage-dot";
    if (stage.done) cls += " done";
    else if (stage.running) cls += " running";
    return `<span class="${cls}" title="${esc(stage.label)}"></span>`;
  }

  function renderTable() {
    if (!requests.length) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="meta">אין בקשות</td></tr>';
      return;
    }
    tbody.innerHTML = requests
      .map((r) => {
        const stages = (r.pipeline && r.pipeline.stages) || [];
        const sel = r.id === selectedId ? " selected" : "";
        const cancelBtn = r.pipeline && r.pipeline.can_cancel
          ? `<button type="button" class="btn btn-sm btn-outline ai-cancel-btn" data-id="${r.id}">בטל</button>`
          : "";
        const archiveBtn = r.pipeline && r.pipeline.can_archive
          ? `<button type="button" class="btn btn-sm btn-danger ai-archive-btn" data-id="${r.id}">מחק</button>`
          : "";
        return `<tr data-id="${r.id}" class="ai-row${sel}">
          <td>${r.id}</td>
          <td class="ai-prompt-cell" title="${esc(r.prompt)}">${esc((r.prompt || "").slice(0, 50))}${(r.prompt || "").length > 50 ? "…" : ""}</td>
          <td><span class="badge badge-muted">${esc(r.status_label)}</span></td>
          ${stages.map((s) => `<td class="ai-stage-cell">${stageDot(s)}</td>`).join("")}
          <td class="ai-actions-cell">${cancelBtn}${archiveBtn}</td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll(".ai-row").forEach((tr) => {
      tr.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        selectRow(Number(tr.dataset.id));
      });
    });
    tbody.querySelectorAll(".ai-cancel-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        cancelRequest(Number(btn.dataset.id));
      });
    });
    tbody.querySelectorAll(".ai-archive-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        archiveRequest(Number(btn.dataset.id));
      });
    });
  }

  function selectRow(id) {
    selectedId = id;
    renderTable();
    renderDetail(requests.find((r) => r.id === id));
  }

  function renderPipeline(p) {
    const bar = document.getElementById("ai-pipeline-bar");
    if (!p || !p.stages) {
      bar.innerHTML = "";
      return;
    }
    bar.innerHTML = p.stages
      .map((s) => {
        let cls = "step";
        if (s.done) cls += " done";
        else if (s.running) cls += " active";
        let icon = s.done ? " ✓" : s.running ? " ⏳" : "";
        return `<span class="${cls}">${esc(s.label)}${icon}</span>`;
      })
      .join("");
  }

  function renderActions(r) {
    const el = document.getElementById("ai-detail-actions");
    if (!r || !r.pipeline) {
      el.innerHTML = "";
      return;
    }
    const p = r.pipeline;
    const btns = [];
    p.stages.forEach((s) => {
      if (s.can_run && s.run_url) {
        btns.push(
          `<button type="button" class="btn btn-sm btn-gold ai-run-stage" data-url="${esc(s.run_url)}">${esc(s.run_label || "הרץ")} — ${esc(s.label)}</button>`,
        );
      }
    });
    if (p.can_cancel && p.cancel_url) {
      btns.push(
        `<button type="button" class="btn btn-sm btn-outline ai-cancel-detail" data-url="${esc(p.cancel_url)}">בטל</button>`,
      );
    }
    if (p.can_archive && p.archive_url) {
      btns.push(
        `<button type="button" class="btn btn-sm btn-danger ai-archive-detail" data-url="${esc(p.archive_url)}">מחק רשומה</button>`,
      );
    }
    if (r.pr_url) {
      btns.push(
        `<a href="${esc(r.pr_url)}" target="_blank" rel="noreferrer" class="btn btn-sm btn-outline">PR ↗</a>`,
      );
    }
    el.innerHTML = btns.join(" ");
    el.querySelectorAll(".ai-run-stage").forEach((btn) => {
      btn.addEventListener("click", () => runStage(btn.dataset.url));
    });
    el.querySelectorAll(".ai-cancel-detail").forEach((btn) => {
      btn.addEventListener("click", () => postJson(btn.dataset.url).then(refresh));
    });
    el.querySelectorAll(".ai-archive-detail").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (confirm("להסיר את הרשומה מהרשימה?")) {
          postJson(btn.dataset.url).then(() => {
            selectedId = null;
            refresh();
          });
        }
      });
    });
  }

  function renderLog(r) {
    const logEl = document.getElementById("ai-log-panel");
    const logs = r.logs || [];
    logEl.textContent = logs
      .map((e) => {
        const ts = e.ts ? `[${e.ts}] ` : "";
        const msg = typeof e === "string" ? e : e.msg || JSON.stringify(e);
        return ts + msg;
      })
      .join("\n");
    logEl.scrollTop = logEl.scrollHeight;
  }

  function renderDiff(r) {
    const filesEl = document.getElementById("ai-diff-files");
    const viewEl = document.getElementById("ai-diff-view");
    const diag = (r.diagnostics || {});
    const segments = diag.segments || [];

    if (!segments.length) {
      filesEl.innerHTML = "";
      viewEl.innerHTML = '<p class="meta">אין diff עדיין</p>';
      return;
    }

    filesEl.innerHTML = segments
      .map((seg, i) => {
        const active = seg.path === activeDiffFile ? " active" : "";
        return `<button type="button" class="ai-diff-file-btn${active}" data-idx="${i}" data-path="${esc(seg.path)}">${esc(seg.path || "קובץ " + (i + 1))}</button>`;
      })
      .join("");

    function showFile(idx) {
      const seg = segments[idx];
      if (!seg) return;
      activeDiffFile = seg.path;
      filesEl.querySelectorAll(".ai-diff-file-btn").forEach((b, i) => {
        b.classList.toggle("active", i === idx);
      });
      viewEl.innerHTML = (seg.lines || [])
        .map((ln) => `<div class="line ${ln.cls || "ctx"}">${esc(ln.text)}</div>`)
        .join("");
    }

    filesEl.querySelectorAll(".ai-diff-file-btn").forEach((btn) => {
      btn.addEventListener("click", () => showFile(Number(btn.dataset.idx)));
    });
    showFile(0);
  }

  async function loadRepo() {
    if (repoCache) return repoCache;
    const res = await fetch(cfg.repoContentUrl);
    repoCache = await res.json();
    return repoCache;
  }

  async function renderRepo() {
    const listEl = document.getElementById("ai-repo-list");
    const contentEl = document.getElementById("ai-repo-content");
    listEl.innerHTML = '<li class="meta">טוען…</li>';
    try {
      const data = await loadRepo();
      const files = data.files || [];
      listEl.innerHTML = files
        .map(
          (f, i) =>
            `<li data-idx="${i}" title="${esc(f.path)}">${esc(f.path)}</li>`,
        )
        .join("");
      listEl.querySelectorAll("li").forEach((li) => {
        li.addEventListener("click", () => {
          listEl.querySelectorAll("li").forEach((x) => x.classList.remove("active"));
          li.classList.add("active");
          const f = files[Number(li.dataset.idx)];
          contentEl.textContent = f ? f.content : "";
        });
      });
      if (files[0]) {
        listEl.querySelector("li").classList.add("active");
        contentEl.textContent = files[0].content;
      }
    } catch {
      listEl.innerHTML = '<li class="meta">שגיאה בטעינה</li>';
    }
  }

  function renderDetail(r) {
    if (!r) {
      panelEmpty.hidden = false;
      panelContent.hidden = true;
      return;
    }
    panelEmpty.hidden = true;
    panelContent.hidden = false;

    document.getElementById("ai-detail-title").textContent =
      `#${r.id} — ${(r.prompt || "").slice(0, 80)}`;
    document.getElementById("ai-detail-meta").textContent =
      `${r.status_label || r.status} · ${r.created_at ? new Date(r.created_at).toLocaleString("he-IL") : ""}`;

    const errEl = document.getElementById("ai-detail-error");
    if (r.error) {
      errEl.hidden = false;
      errEl.textContent = r.error;
    } else {
      errEl.hidden = true;
    }

    renderPipeline(r.pipeline);
    renderActions(r);
    renderLog(r);
    renderDiff(r);
  }

  async function runStage(url) {
    await postJson(url);
    refresh();
  }

  async function cancelRequest(id) {
    const r = requests.find((x) => x.id === id);
    if (!r || !r.cancel_url) return;
    if (!confirm("לבטל את הבקשה?")) return;
    await postJson(r.cancel_url);
    refresh();
  }

  async function archiveRequest(id) {
    const r = requests.find((x) => x.id === id);
    const url = r && r.pipeline && r.pipeline.archive_url;
    if (!url) return;
    if (!confirm("להסיר את הרשומה מהרשימה?")) return;
    await postJson(url);
    if (selectedId === id) selectedId = null;
    refresh();
  }

  function updateQueue(q) {
    if (!q) return;
    const pending = q.pending_global || 0;
    const running = q.running_global ? " · רץ" : "";
    queueBadge.textContent = `תור: ${pending} ממתינים${running}`;
  }

  async function refresh() {
    try {
      const res = await fetch(cfg.listStatusUrl, { cache: "no-store" });
      const data = await res.json();
      requests = data.requests || [];
      updateQueue(data.queue);
      renderTable();
      if (selectedId) {
        renderDetail(requests.find((r) => r.id === selectedId));
      }
      lastSync.textContent = "עודכן: " + new Date().toLocaleTimeString("he-IL");
    } catch (e) {
      queueBadge.textContent = "שגיאת רשת";
    }
  }

  document.querySelectorAll(".ai-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".ai-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const name = tab.dataset.tab;
      document.querySelectorAll(".ai-tab-panel").forEach((p) => {
        p.hidden = !p.id.endsWith(name);
      });
      if (name === "repo") renderRepo();
    });
  });

  refresh();
  setInterval(refresh, 3000);
  if (selectedId) selectRow(selectedId);
})();
