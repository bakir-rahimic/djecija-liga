/*
  Youth League – Single‑File JS App (Vanilla JS)
  ------------------------------------------------
  Features:
  • Teams CRUD (with safety if used in matches)
  • Schedule matches (datetime-local)
  • Live match scoring (admin only)
  • Results list (edit/delete as admin)
  • Standings table (auto-calculated)
  • Admin mode via simple code: "admin123"
  • Persistence in localStorage (no backend)

  Usage:
  1) Create an empty index.html that loads this file (see chat for snippet).
  2) Open index.html in a browser. Everything is rendered by this JS file.

  Repository/hosting: Commit both index.html and this app.js to a public GitHub repo and enable GitHub Pages.
*/

(function () {
  const LS_KEY = "youth-league-state-v1";
  const ADMIN_CODE = "admin123";

  // --- State ---
  let state = loadState() || {
    teams: [
      { id: uid(), name: "Tim Alpha", short: "ALP" },
      { id: uid(), name: "Tim Beta", short: "BET" },
    ],
    matches: [
      // Example structure:
      // { id, homeId, awayId, dateISO, played, goalsHome, goalsAway }
    ],
  };
  let ui = {
    isAdmin: false,
    route: "table", // table | schedule | results | live | teams
    showNav: true,
  };

  // --- Init ---
  onReady(() => {
    injectStyles();
    render();
  });

  // --- Rendering Root ---
  function render() {
    document.body.innerHTML = "";
    document.body.className = "yl-body";

    const app = el("div", "yl-app");
    const container = el("div", "yl-container");

    // Header
    container.appendChild(renderHeader());

    // Shell grid
    const shell = el("div", "yl-shell");
    const nav = renderNav();
    const main = el("main", "yl-main");

    shell.appendChild(nav);
    shell.appendChild(main);

    container.appendChild(shell);
    container.appendChild(renderFooter());
    app.appendChild(container);
    document.body.appendChild(app);

    // Main content
    main.innerHTML = "";
    if (ui.route === "table") main.appendChild(renderTable());
    if (ui.route === "teams") main.appendChild(renderTeams());
    if (ui.route === "schedule") main.appendChild(renderSchedule());
    if (ui.route === "results") main.appendChild(renderResults());
    if (ui.route === "live") main.appendChild(renderLive());
  }

  function renderHeader() {
    const header = el("header", "yl-header");
    const left = el("div", "yl-h-left");
    const burger = button("☰", "yl-burger", () => {
      ui.showNav = !ui.showNav;
      render();
    });
    left.appendChild(burger);
    left.appendChild(h1("Liga mladih • Web app"));

    const right = el("div", "yl-h-right");
    const pill = el("span", ui.isAdmin ? "yl-pill admin" : "yl-pill");
    pill.textContent = ui.isAdmin ? "ADMIN MOD" : "Gost";
    right.appendChild(pill);

    header.appendChild(left);
    header.appendChild(right);
    return header;
  }

  function renderNav() {
    const nav = el("nav", ui.showNav ? "yl-nav" : "yl-nav hidden");
    nav.appendChild(navItem("Tabela", ui.route === "table", () => switchRoute("table")));
    nav.appendChild(navItem("Raspored", ui.route === "schedule", () => switchRoute("schedule")));
    nav.appendChild(navItem("Rezultati", ui.route === "results", () => switchRoute("results"))));
    nav.appendChild(divider());
    nav.appendChild(navItem("Uživo utakmica", ui.route === "live", () => switchRoute("live")));
    nav.appendChild(divider());
    nav.appendChild(navItem("Timovi", ui.route === "teams", () => switchRoute("teams"))));

    // Admin toggle
    const adminBox = el("div", "yl-admin-box");
    if (!ui.isAdmin) {
      const btn = button("Admin prijava", "yl-btn primary wfull", () => {
        const code = prompt("Unesite admin kod", "");
        if (code === ADMIN_CODE) ui.isAdmin = true;
        render();
      });
      adminBox.appendChild(btn);
    } else {
      const btn = button("Odjava (admin)", "yl-btn danger wfull", () => {
        ui.isAdmin = false;
        render();
      });
      adminBox.appendChild(btn);
    }
    nav.appendChild(adminBox);

    return nav;
  }

  function renderFooter() {
    const f = el("footer", "yl-footer");
    f.textContent = "Made with ❤️ — LocalStorage demo, no backend needed.";
    return f;
  }

  // --- Views ---
  function renderTeams() {
    const card = cardWrap("Timovi");

    if (ui.isAdmin) {
      const grid = el("div", "yl-grid3 mb4");
      const inName = input("Naziv tima", "");
      const inShort = input("Kratica (3 slova)", "");
      const add = button("Dodaj tim", "yl-btn dark", () => {
        const name = inName.value.trim();
        if (!name) return;
        const code = (inShort.value || name).toUpperCase().slice(0, 3);
        state.teams.push({ id: uid(), name, short: code });
        saveState(state);
        render();
      });
      grid.append(inName, inShort, add);
      card.appendChild(grid);
    } else {
      card.appendChild(p("Za dodavanje timova potrebna je admin prijava.", "muted"));
    }

    const gridTeams = el("div", "yl-gridCards");
    state.teams.forEach((t) => {
      const row = el("div", "yl-row team");
      const info = el("div", "");
      info.appendChild(strong(t.name));
      info.appendChild(p(t.short, "tiny muted"));
      row.appendChild(info);
      if (ui.isAdmin) {
        const used = state.matches.some((m) => m.homeId === t.id || m.awayId === t.id);
        const del = button("Obriši", used ? "yl-link danger disabled" : "yl-link danger", () => {
          if (used) return alert("Tim ima zakazane ili odigrane utakmice – brisanje nije moguće.");
          state.teams = state.teams.filter((x) => x.id !== t.id);
          saveState(state);
          render();
        });
        row.appendChild(del);
      }
      gridTeams.appendChild(row);
    });
    card.appendChild(gridTeams);
    return card;
  }

  function renderSchedule() {
    const card = cardWrap("Raspored");

    if (ui.isAdmin && state.teams.length >= 2) {
      const grid = el("div", "yl-grid5 mb4");
      const selHome = selectTeams(state.teams);
      const selAway = selectTeams(state.teams, 1);
      const dt = inputDateTime(nowISO());
      const add = button("Dodaj utakmicu", "yl-btn dark", () => {
        const homeId = selHome.value;
        const awayId = selAway.value;
        if (!homeId || !awayId || homeId === awayId) return alert("Odaberite dva različita tima.");
        state.matches.push({ id: uid(), homeId, awayId, dateISO: dt.value, played: false, goalsHome: 0, goalsAway: 0 });
        saveState(state);
        render();
      });
      const nowBtn = button("Sad", "yl-btn", () => (dt.value = nowISO()));
      grid.append(selHome, selAway, dt, add, nowBtn);
      card.appendChild(grid);
    } else {
      card.appendChild(p("Za zakazivanje utakmica potrebna su najmanje 2 tima i admin mod.", "muted"));
    }

    const upcoming = state.matches.filter((m) => !m.played).sort((a, b) => a.dateISO.localeCompare(b.dateISO));

    if (upcoming.length === 0) {
      card.appendChild(empty("Nema zakazanih utakmica."));
    } else {
      const list = el("div", "yl-list");
      upcoming.forEach((m) => {
        const row = el("div", "yl-row");
        row.appendChild(badge(formatDate(m.dateISO)));
        row.appendChild(span(`${teamName(m.homeId)} vs ${teamName(m.awayId)}`));
        if (ui.isAdmin) {
          row.appendChild(button("Ukloni", "yl-link danger", () => {
            state.matches = state.matches.filter((x) => x.id !== m.id);
            saveState(state);
            render();
          }));
        }
        list.appendChild(row);
      });
      card.appendChild(list);
    }

    return card;
  }

  function renderResults() {
    const card = cardWrap("Rezultati");
    const played = state.matches.filter((m) => m.played).sort((a, b) => b.dateISO.localeCompare(a.dateISO));

    if (played.length === 0) return card.appendChild(empty("Još nema odigranih utakmica.")), card;

    const list = el("div", "yl-list");
    played.forEach((m) => {
      const row = el("div", "yl-row between");
      const left = el("div", "yl-flex gap");
      left.appendChild(badge(formatDate(m.dateISO)));
      left.appendChild(span(`${teamName(m.homeId)} vs ${teamName(m.awayId)}`));

      const right = el("div", "yl-flex gap");
      if (ui.isAdmin) {
        const inH = number(m.goalsHome, (v) => updateScore(m.id, v, m.goalsAway));
        const inA = number(m.goalsAway, (v) => updateScore(m.id, m.goalsHome, v));
        right.appendChild(inH);
        right.appendChild(span(":", "bold"));
        right.appendChild(inA);
        right.appendChild(button("Obriši", "yl-link danger", () => deleteMatch(m.id)));
      } else {
        right.appendChild(span(`${m.goalsHome} : ${m.goalsAway}`, "bold"));
      }
      row.append(left, right);
      list.appendChild(row);
    });
    card.appendChild(list);
    return card;
  }

  function renderLive() {
    const card = cardWrap("Uživo utakmica");
    const candidates = state.matches.filter((m) => !m.played);

    if (candidates.length === 0) {
      card.appendChild(empty("Nema utakmica za prikaz uživo. Zakazite novu u Rasporedu."));
      return card;
    }

    const sel = document.createElement("select");
    sel.className = "yl-input wfull";
    candidates.forEach((m) => {
      const o = document.createElement("option");
      o.value = m.id;
      o.textContent = `${formatDateTime(m.dateISO)} — ${teamName(m.homeId)} vs ${teamName(m.awayId)}`;
      sel.appendChild(o);
    });

    let current = candidates[0].id;
    sel.value = current;
    sel.onchange = () => {
      current = sel.value;
      renderScore();
    };

    card.appendChild(label("Odaberite utakmicu"));
    card.appendChild(sel);

    const box = el("div", "yl-livebox");
    card.appendChild(box);

    function renderScore() {
      box.innerHTML = "";
      const m = state.matches.find((x) => x.id === current);
      if (!m) return;

      const head = el("div", "yl-live-head");
      head.appendChild(col("Domaćin", teamName(m.homeId)));
      head.appendChild(span(`${m.goalsHome} : ${m.goalsAway}`, "live-score"));
      head.appendChild(col("Gost", teamName(m.awayId)));
      box.appendChild(head);

      if (ui.isAdmin) {
        const grid = el("div", "yl-grid4 mt");
        grid.appendChild(button("+1 Domaćin", "yl-btn", () => step(current, +1, 0)));
        grid.appendChild(button("-1 Domaćin", "yl-btn", () => step(current, -1, 0)));
        grid.appendChild(button("+1 Gost", "yl-btn", () => step(current, 0, +1)));
        grid.appendChild(button("-1 Gost", "yl-btn", () => step(current, 0, -1)));
        const fin = button("Završi utakmicu", "yl-btn success col2", () => finish(current));
        grid.appendChild(fin);
        box.appendChild(grid);
      } else {
        box.appendChild(p("Prijavite se kao admin za kontrolu rezultata uživo.", "muted mt"));
      }
    }

    renderScore();
    return card;
  }

  function renderTable() {
    const card = cardWrap("Tabela");
    const rows = buildTable(state.teams, state.matches);

    const table = document.createElement("table");
    table.className = "yl-table";
    const thead = document.createElement("thead");
    thead.innerHTML = `<tr>
      <th>#</th><th>Tim</th><th>U</th><th>P</th><th>N</th><th>I</th><th>DG</th><th>PG</th><th>GR</th><th>Bod</th>
    </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    rows.forEach((r, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td class="bold">${escapeHtml(r.name)}</td>
        <td>${r.PLD}</td>
        <td>${r.W}</td>
        <td>${r.D}</td>
        <td>${r.L}</td>
        <td>${r.GF}</td>
        <td>${r.GA}</td>
        <td>${r.GD}</td>
        <td class="bold">${r.PTS}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);
    return card;
  }

  // --- Actions ---
  function switchRoute(r) {
    ui.route = r;
    render();
  }
  function updateScore(id, gh, ga) {
    gh = clampInt(gh, 0);
    ga = clampInt(ga, 0);
    state.matches = state.matches.map((m) => (m.id === id ? { ...m, goalsHome: gh, goalsAway: ga } : m));
    saveState(state);
    render();
  }
  function deleteMatch(id) {
    state.matches = state.matches.filter((m) => m.id !== id);
    saveState(state);
    render();
  }
  function step(id, dH, dA) {
    state.matches = state.matches.map((m) =>
      m.id === id
        ? {
            ...m,
            goalsHome: Math.max(0, m.goalsHome + dH),
            goalsAway: Math.max(0, m.goalsAway + dA),
          }
        : m
    );
    saveState(state);
    render();
  }
  function finish(id) {
    state.matches = state.matches.map((m) => (m.id === id ? { ...m, played: true } : m));
    saveState(state);
    render();
  }

  // --- Helpers (UI) ---
  function cardWrap(title) {
    const c = el("section", "yl-card");
    const head = el("div", "yl-card-head");
    const h = h2(title);
    head.appendChild(h);
    c.appendChild(head);
    return c;
  }

  function navItem(label, active, onClick) {
    const btn = button(label, active ? "yl-nav-item active" : "yl-nav-item", onClick);
    return btn;
  }

  function divider() {
    return el("div", "yl-divider");
  }

  function selectTeams(teams, index = 0) {
    const s = document.createElement("select");
    s.className = "yl-input";
    teams.forEach((t, i) => {
      const o = document.createElement("option");
      o.value = t.id;
      o.textContent = t.name;
      s.appendChild(o);
      if (i === index) s.value = t.id;
    });
    return s;
  }

  function input(placeholder = "", value = "") {
    const i = document.createElement("input");
    i.type = "text";
    i.placeholder = placeholder;
    i.value = value;
    i.className = "yl-input";
    return i;
  }

  function number(value, onChange) {
    const i = document.createElement("input");
    i.type = "number";
    i.className = "yl-input small";
    i.value = String(value);
    i.oninput = () => onChange(clampInt(i.value, 0));
    return i;
  }

  function inputDateTime(value) {
    const i = document.createElement("input");
    i.type = "datetime-local";
    i.className = "yl-input";
    i.value = value || nowISO();
    return i;
  }

  function label(text) {
    const l = el("label", "yl-label");
    l.textContent = text;
    return l;
  }

  function empty(text) {
    return p(text, "muted");
  }

  function col(caption, value) {
    const box = el("div", "yl-col");
    box.appendChild(p(caption, "tiny muted"));
    box.appendChild(h3(value));
    return box;
  }

  // --- Helpers (logic) ---
  function buildTable(teams, matches) {
    const rows = teams.map((t) => ({ id: t.id, name: t.name, PLD: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, PTS: 0 }));
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    matches.filter((m) => m.played).forEach((m) => {
      const H = byId[m.homeId];
      const A = byId[m.awayId];
      if (!H || !A) return;
      H.PLD++; A.PLD++;
      H.GF += m.goalsHome; H.GA += m.goalsAway;
      A.GF += m.goalsAway; A.GA += m.goalsHome;
      if (m.goalsHome > m.goalsAway) { H.W++; A.L++; H.PTS += 3; }
      else if (m.goalsHome < m.goalsAway) { A.W++; H.L++; A.PTS += 3; }
      else { H.D++; A.D++; H.PTS++; A.PTS++; }
    });
    rows.forEach((r) => (r.GD = r.GF - r.GA));
    rows.sort((a, b) => b.PTS - a.PTS || b.GD - a.GD || b.GF - a.GF || a.name.localeCompare(b.name));
    return rows;
  }

  function teamName(id) {
    const t = state.teams.find((x) => x.id === id);
    return t ? t.name : "?";
  }

  function nowISO() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString();
  }
  function formatDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString();
  }

  function clampInt(val, min) {
    const n = parseInt(val, 10);
    return isNaN(n) ? min : Math.max(min, n);
  }

  function saveState(st) {
    localStorage.setItem(LS_KEY, JSON.stringify(st));
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }
  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  // --- Tiny DOM helpers ---
  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    for (let i = 2; i < arguments.length; i++) {
      const child = arguments[i];
      if (child == null) continue;
      if (Array.isArray(child)) child.forEach((c) => e.appendChild(node(c)));
      else e.appendChild(node(child));
    }
    return e;
  }
  function node(x) {
    return typeof x === "string" ? document.createTextNode(x) : x;
  }
  function h1(t) { const e = document.createElement("h1"); e.textContent = t; e.className = "h1"; return e; }
  function h2(t) { const e = document.createElement("h2"); e.textContent = t; e.className = "h2"; return e; }
  function h3(t) { const e = document.createElement("h3"); e.textContent = t; e.className = "h3"; return e; }
  function p(t, cls="") { const e = document.createElement("p"); e.textContent = t; e.className = `p ${cls}`.trim(); return e; }
  function span(t, cls="") { const e = document.createElement("span"); e.textContent = t; e.className = cls; return e; }
  function strong(t) { const e = document.createElement("strong"); e.textContent = t; return e; }
  function labelEl(t) { const l = document.createElement("label"); l.textContent = t; return l; }
  function button(t, cls, onClick) { const b = document.createElement("button"); b.textContent = t; b.className = cls; if (onClick) b.onclick = onClick; return b; }
  function badge(t) { const b = document.createElement("span"); b.className = "yl-badge"; b.textContent = t; return b; }
  function label(t) { const l = document.createElement("label"); l.className = "yl-label"; l.textContent = t; return l; }

  // --- Styles ---
  function injectStyles() {
    const css = `
    :root{--bg:#f7f7f8;--fg:#111;--muted:#6b7280;--card:#fff;--bd:#e5e7eb;--accent:#111;--green:#22c55e;--red:#ef4444;}
    *{box-sizing:border-box} html,body{margin:0;padding:0}
    body.yl-body{background:var(--bg);color:var(--fg);font:16px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif}
    .yl-container{max-width:1100px;margin:0 auto;padding:16px}
    .yl-header{position:sticky;top:0;background:var(--card);border-bottom:1px solid var(--bd);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;z-index:10}
    .yl-h-left{display:flex;gap:10px;align-items:center}
    .yl-burger{height:36px;width:36px;border:1px solid var(--bd);background:#fff;border-radius:10px}
    .h1{font-size:20px;font-weight:800}
    .yl-pill{font-size:12px;padding:4px 8px;border-radius:999px;background:#f3f4f6;color:#111}
    .yl-pill.admin{background:#dcfce7;color:#166534}
    .yl-shell{display:grid;grid-template-columns:260px 1fr;gap:16px;margin-top:16px}
    .yl-nav{position:sticky;top:64px;align-self:start;background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:12px}
    .yl-nav.hidden{display:none}
    .yl-nav-item{width:100%;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid transparent;background:transparent}
    .yl-nav-item:hover{background:#f3f4f6}
    .yl-nav-item.active{background:#111;color:#fff}
    .yl-divider{height:1px;background:var(--bd);margin:8px 0}
    .yl-admin-box{margin-top:8px}
    .yl-btn{padding:8px 12px;border-radius:12px;border:1px solid var(--bd);background:#fff}
    .yl-btn.wfull{width:100%}
    .yl-btn.primary{background:#111;color:#fff;border-color:#111}
    .yl-btn.dark{background:#111;color:#fff;border-color:#111}
    .yl-btn.success{background:var(--green);color:#fff;border-color:var(--green)}
    .yl-btn.danger{background:var(--red);color:#fff;border-color:var(--red)}
    .yl-link{background:transparent;border:none;color:#2563eb;padding:0}
    .yl-link.danger{color:var(--red)}
    .yl-link.disabled{opacity:.5;pointer-events:none}

    .yl-main{min-height:60vh}
    .yl-card{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:16px}
    .yl-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
    .h2{font-size:18px;font-weight:700}
    .h3{font-size:20px;font-weight:800}
    .p{margin:.25rem 0}
    .muted{color:var(--muted)}
    .tiny{font-size:12px}
    .bold{font-weight:700}
    .mb4{margin-bottom:16px}
    .gap{gap:8px}
    .mt{margin-top:12px}

    .yl-input{border:1px solid var(--bd);border-radius:12px;padding:10px 12px;min-width:0}
    .yl-input.small{width:64px;text-align:right}
    .yl-label{display:block;font-size:12px;color:var(--muted);margin:6px 0}

    .yl-grid3{display:grid;grid-template-columns:1fr 1fr auto;gap:8px}
    .yl-grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px}
    .yl-grid5{display:grid;grid-template-columns:1fr 1fr auto auto auto;gap:8px}
    .yl-gridCards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}

    .yl-row{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--bd);border-radius:14px;padding:10px 12px}
    .yl-row.team{justify-content:space-between}
    .yl-list{display:flex;flex-direction:column;gap:8px}

    .yl-badge{font-size:12px;background:#f3f4f6;border-radius:999px;padding:4px 8px;color:#111}

    .yl-livebox{border:1px solid var(--bd);border-radius:16px;padding:16px;margin-top:8px}
    .yl-live-head{display:flex;align-items:center;justify-content:space-between}
    .live-score{font-weight:800;font-size:28px}
    .yl-col{text-align:center}

    .yl-table{width:100%;border-collapse:collapse}
    .yl-table th,.yl-table td{padding:8px;text-align:left;border-top:1px solid var(--bd)}

    .yl-footer{text-align:center;color:var(--muted);font-size:12px;padding:24px 0}

    @media (max-width: 900px){
      .yl-shell{grid-template-columns:1fr}
      .yl-nav{position:relative;top:auto}
      .yl-gridCards{grid-template-columns:1fr 1fr}
      .yl-grid5{grid-template-columns:1fr 1fr 1fr;}
    }
    @media (max-width: 600px){
      .yl-gridCards{grid-template-columns:1fr}
      .yl-grid3{grid-template-columns:1fr;}
      .yl-grid4{grid-template-columns:1fr 1fr;}
    }
    `;
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }
})();
