// ==UserScript==
// @name         Dystopia Unified Faction Command Dashboard
// @namespace    dystopia.faction.unified
// @version      4.0.0
// @description  Unified multi-panel faction dashboard: analytics, compliance, bank, war scan, simulator, loadout (PDA Safe)
// @match        https://www.torn.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/you/dystopia-faction/raw/main/faction-os.user.js
// @updateURL    https://raw.githubusercontent.com/you/dystopia-faction/raw/main/faction-os.user.js
// ==/UserScript==

(function () {
    'use strict';

    /* =========================
       CONSTANTS / STORAGE
    ========================= */

    const DASH_ID = "dystopia_unified_dash";
    const STORE_KEY = "dystopia_unified_state";

    const state = GM_getValue(STORE_KEY, {
        start: Date.now(),
        lastActive: Date.now(),

        stats: {
            hits: 0,
            respect: 0,
            money: 0,
            xanax: 0
        },

        bankRequests: [],
        officerMode: false,

        settings: {
            scan: true,
            simulator: true,
            loadout: true
        },

        lastTargets: ""
    });

    function save() {
        GM_setValue(STORE_KEY, state);
    }

    /* =========================
       UTILITIES
    ========================= */

    function hoursSince(t) {
        return ((Date.now() - t) / 3600000).toFixed(2);
    }

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    function isOfficer() {
        const t = document.body.textContent;
        return t.includes("Officer") || t.includes("Leader") || state.officerMode;
    }

    function copyToClipboard(text) {
        const t = document.createElement("textarea");
        t.value = text;
        document.body.appendChild(t);
        t.select();
        document.execCommand("copy");
        document.body.removeChild(t);
        alert("Copied to clipboard.");
    }

    /* =========================
       ANALYTICS LOGIC
    ========================= */

    function respectEfficiency() {
        return (state.stats.respect / Math.max(state.stats.hits, 1)).toFixed(2);
    }

    function efficiencyRank() {
        const e = respectEfficiency();
        if (e >= 0.35) return "Elite";
        if (e >= 0.25) return "Solid";
        if (e >= 0.15) return "Low";
        return "Poor";
    }

    function complianceStatus() {
        if (state.stats.hits >= 10 && state.stats.xanax >= 1) return "Compliant";
        if (state.stats.hits > 0) return "Warning";
        return "Non-Compliant";
    }

    function xanDiscipline() {
        const expected = Math.floor(hoursSince(state.start) / 6);
        if (state.stats.xanax === expected) return "Perfect";
        if (state.stats.xanax < expected) return "Under-used";
        return "Over-used";
    }

    /* =========================
       WAR SCAN
    ========================= */

    function scanFaction() {
        if (!state.settings.scan) return;

        const text = document.body.textContent;
        const levels = text.match(/Level\s+\d+/gi) || [];

        const low = [], mid = [], high = [], avoid = [];

        levels.forEach(lvl => {
            const n = parseInt(lvl.replace(/\D/g, ""), 10);
            if (n < 25) low.push("L" + n);
            else if (n < 50) mid.push("L" + n);
            else if (n < 80) high.push("L" + n);
            else avoid.push("L" + n);
        });

        state.lastTargets =
            "LOW\n" + low.join(", ") + "\n\n" +
            "MID\n" + mid.join(", ") + "\n\n" +
            "HIGH\n" + high.join(", ") + "\n\n" +
            "AVOID\n" + avoid.join(", ");

        save();
        renderAll();
    }

    /* =========================
       UI CREATION
    ========================= */

    function createDashboard() {
        if (document.getElementById(DASH_ID)) return;

        const dash = document.createElement("div");
        dash.id = DASH_ID;

        dash.innerHTML = `
            <div id="d_head">Dystopia Command Dashboard</div>
            <div id="d_body">

                <h4>Analytics</h4>
                <div id="panel_analytics"></div>

                <h4>Member Status</h4>
                <div id="panel_status"></div>

                <h4>Faction Bank</h4>
                <div id="panel_bank"></div>

                <h4>War Tools</h4>
                <div id="panel_war"></div>

                <h4>War Simulator</h4>
                <div id="panel_sim"></div>

                <h4>Loadout Assistant</h4>
                <div id="panel_loadout"></div>

                <h4>Officer Controls</h4>
                <div id="panel_officer"></div>

            </div>
        `;

        document.body.appendChild(dash);
        makeDraggable(dash);
        makeCollapsible();
    }

    GM_addStyle(`
        #${DASH_ID}{
            position:fixed;
            top:120px;
            left:20px;
            width:320px;
            background:#111;
            color:#eee;
            border:1px solid #444;
            font-size:12px;
            z-index:9999
        }
        #d_head{
            background:#222;
            padding:6px;
            font-weight:bold;
            cursor:move
        }
        #d_body{padding:6px}
        h4{
            margin:6px 0 2px;
            font-size:12px;
            border-bottom:1px solid #333
        }
        button{width:100%;margin:2px 0}
        pre{white-space:pre-wrap}
    `);

    function makeCollapsible() {
        const head = document.getElementById("d_head");
        const body = document.getElementById("d_body");
        head.onclick = () => {
            body.style.display = body.style.display === "none" ? "block" : "none";
        };
    }

    function makeDraggable(el) {
        const head = el.querySelector("#d_head");
        let dragging = false, ox = 0, oy = 0;

        head.onmousedown = e => {
            dragging = true;
            ox = e.clientX - el.offsetLeft;
            oy = e.clientY - el.offsetTop;
        };

        document.onmousemove = e => {
            if (!dragging) return;
            el.style.left = clamp(e.clientX - ox, 0, window.innerWidth - 50) + "px";
            el.style.top = clamp(e.clientY - oy, 0, window.innerHeight - 50) + "px";
        };

        document.onmouseup = () => dragging = false;
    }

    /* =========================
       RENDER PANELS
    ========================= */

    function renderAnalytics() {
        panel_analytics.innerHTML = `
            Hits: ${state.stats.hits}<br>
            Respect: ${state.stats.respect}<br>
            Money: $${state.stats.money.toLocaleString()}<br>
            Xanax: ${state.stats.xanax}<br>
            Session: ${hoursSince(state.start)}h<br>
            Efficiency: ${respectEfficiency()}
        `;
    }

    function renderStatus() {
        panel_status.innerHTML = `
            Compliance: ${complianceStatus()}<br>
            Efficiency Rank: ${efficiencyRank()}<br>
            Xan Discipline: ${xanDiscipline()}<br>
            Inactivity: ${hoursSince(state.lastActive)}h
        `;
    }

    function renderBank() {
        let html = `<button id="req_bank">Request Withdrawal</button><br>`;
        if (isOfficer()) {
            html += state.bankRequests.map((r, i) =>
                `${i + 1}. $${Number(r.amount).toLocaleString()} [${r.status}]`
            ).join("<br>");
        }
        panel_bank.innerHTML = html;
    }

    function renderWar() {
        panel_war.innerHTML = `
            <button id="scan_btn">Scan Enemy Faction</button>
            <pre>${state.lastTargets || ""}</pre>
            <button id="copy_targets">Copy for Notes</button>
        `;
    }

    function renderSim() {
        if (!state.settings.simulator) {
            panel_sim.innerHTML = "Disabled";
            return;
        }
        panel_sim.innerHTML =
            "LOW/MID focus → High win probability<br>" +
            "HIGH targets → Chain risk ↑<br>" +
            "AVOID → Officer authorization only";
    }

    function renderLoadout() {
        if (!state.settings.loadout) {
            panel_loadout.innerHTML = "Disabled";
            return;
        }
        panel_loadout.innerHTML =
            "LOW: Speed weapons, no boosters<br>" +
            "MID: Balanced kit<br>" +
            "HIGH: Armor + boosters<br>" +
            "AVOID: Skip";
    }

    function renderOfficer() {
        panel_officer.innerHTML = `
            <label><input type="checkbox" id="officer_toggle" ${state.officerMode ? "checked" : ""}> Officer Mode</label><br>
            <label><input type="checkbox" id="t_scan" ${state.settings.scan ? "checked" : ""}> Enemy Scan</label><br>
            <label><input type="checkbox" id="t_sim" ${state.settings.simulator ? "checked" : ""}> Simulator</label><br>
            <label><input type="checkbox" id="t_load" ${state.settings.loadout ? "checked" : ""}> Loadout</label>
        `;
    }

    function renderAll() {
        renderAnalytics();
        renderStatus();
        renderBank();
        renderWar();
        renderSim();
        renderLoadout();
        renderOfficer();
    }

    /* =========================
       EVENTS
    ========================= */

    document.addEventListener("click", e => {
        state.lastActive = Date.now();

        if (e.target.id === "req_bank") {
            const amt = prompt("Enter withdrawal amount:");
            if (!amt) return;
            state.bankRequests.push({ amount: amt, status: "Pending" });
            save();
            renderBank();
        }

        if (e.target.id === "scan_btn") scanFaction();

        if (e.target.id === "copy_targets") {
            copyToClipboard("WAR TARGETS\n\n" + state.lastTargets + "\n\nUpdated: " + new Date().toLocaleString());
        }

        if (e.target.id === "officer_toggle") state.officerMode = e.target.checked;
        if (e.target.id === "t_scan") state.settings.scan = e.target.checked;
        if (e.target.id === "t_sim") state.settings.simulator = e.target.checked;
        if (e.target.id === "t_load") state.settings.loadout = e.target.checked;

        save();
    });

    /* =========================
       BOOT
    ========================= */

    function boot() {
        createDashboard();
        renderAll();
        setInterval(renderAll, 5000);
    }

    setTimeout(boot, 1500);

})();