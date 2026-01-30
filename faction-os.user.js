// ==UserScript==
// @name         Dystopia Faction Dashboard
// @namespace    dystopia.faction.dashboard
// @version      3.0.0
// @description  Multi-panel faction analytics, compliance, and war dashboard
// @match        https://www.torn.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/you/dystopia-faction/raw/main/faction-os.user.js
// @updateURL    https://raw.githubusercontent.com/you/dystopia-faction/raw/main/faction-os.user.js
// ==/UserScript==

(function () {
    'use strict';

    /* =======================
       CONFIG / STORAGE
    ======================= */
var settings = GM_getValue("d_settings", {
        scan: true,
        simulator: true,
        loadout: true
    });
    var DASH_ID = "dystopia_dash";
    var STORE_KEY = "dystopia_stats";

    var stats = GM_getValue(STORE_KEY, {
        start: Date.now(),
        hits: 0,
        respect: 0,
        money: 0,
        xanax: 0,
        lastActive: Date.now(),
        bankRequests: [],
        officerMode: false
    });

    function save() {
        GM_setValue(STORE_KEY, stats);
    }

    /* =======================
       UTILITIES
    ======================= */

    function hoursSince(t) {
        return ((Date.now() - t) / 3600000).toFixed(2);
    }

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    /* =======================
       ANALYTICS LOGIC
    ======================= */

    function respectEfficiency() {
        return (stats.respect / Math.max(stats.hits, 1)).toFixed(2);
    }

    function efficiencyRank() {
        var e = respectEfficiency();
        if (e >= 0.35) return "Elite";
        if (e >= 0.25) return "Solid";
        if (e >= 0.15) return "Low";
        return "Poor";
    }

    function complianceStatus() {
        if (stats.hits >= 10 && stats.xanax >= 1) return "Compliant";
        if (stats.hits > 0) return "Warning";
        return "Non-Compliant";
    }

    function xanDiscipline() {
        var expected = Math.floor(hoursSince(stats.start) / 6);
        if (stats.xanax === expected) return "Perfect";
        if (stats.xanax < expected) return "Under-used";
        return "Over-used";
    }
 /* ================= HELPERS ================= */

    function isOfficer() {
        var t = document.body.textContent;
        return t.indexOf("Officer") !== -1 || t.indexOf("Leader") !== -1;
    }

    function copy(text) {
        var t = document.createElement("textarea");
        t.value = text;
        document.body.appendChild(t);
        t.select();
        document.execCommand("copy");
        document.body.removeChild(t);
        alert("Copied. Paste into Faction Notes.");
    }

    /* =======================
       UI CREATION
    ======================= */

    function createDashboard() {
        if (document.getElementById(DASH_ID)) return;

        var dash = document.createElement("div");
        dash.id = DASH_ID;
        dash.innerHTML =
            "<div id='d_head' style='background:#222;padding:6px;font-weight:bold;cursor:pointer;'>Dystopia Command</div>" +
            "<div id='d_body' style='padding:6px;'>" +

            "<b>Analytics</b><div id='a_box'></div><hr>" +

            "<b>Bank Request</b>" +
            "<input id='b_amt' type='number' style='width:100%;margin-bottom:4px;' placeholder='Amount'>" +
            "<button id='b_req' style='width:100%;'>Request</button>" +
            "<div id='b_list'></div><hr>" +

            "<b>War Tools</b>" +
            "<button id='scan_btn' style='width:100%;'>Scan Enemy Faction</button>" +
            "<pre id='targets' style='white-space:pre-wrap;'></pre>" +
            "<button id='pub_notes' style='width:100%;'>Copy for Notes</button><hr>" +

            "<b>War Simulator</b><div id='sim'></div><hr>" +

            "<b>Loadout Assistant</b><div id='load'></div><hr>" +

            "<b>Officer Toggles</b>" +
            "<label><input type='checkbox' id='t_scan'> Enemy Scan</label><br>" +
            "<label><input type='checkbox' id='t_sim'> Simulator</label><br>" +
            "<label><input type='checkbox' id='t_load'> Loadout</label>" +

            "</div>";

        document.body.appendChild(dash);
        makeDraggable(dash);
        makeCollapsible();
    }

    GM_addStyle(
        "#" + DASH_ID + "{" +
        "position:fixed;top:120px;left:20px;width:300px;" +
        "background:#111;color:#eee;z-index:9999;" +
        "border:1px solid #444;font-size:12px}" +
        "#d_head{background:#222;padding:6px;cursor:move;font-weight:bold}" +
        "#d_body{padding:6px}" +
        "h4{margin:6px 0 2px 0;font-size:12px;border-bottom:1px solid #333}"
    );

    /* =======================
       UI BEHAVIOR
    ======================= */
    document.getElementById("t_scan").checked = settings.scan;
        document.getElementById("t_sim").checked = settings.simulator;
        document.getElementById("t_load").checked = settings.loadout;

    document.getElementById("t_scan").onchange = save.Settings;
        document.getElementById("t_sim").onchange = save.Settings;
        document.getElementById("t_load").onchange = save.Settings;

    function makeCollapsible() {
        var head = document.getElementById("d_head");
        var body = document.getElementById("d_body");

        head.onclick = function () {
            body.style.display =
                body.style.display === "none" ? "block" : "none";
        };
    }

    function makeDraggable(el) {
        var head = el.querySelector("#d_head");
        var dragging = false, ox = 0, oy = 0;

        head.onmousedown = function (e) {
            dragging = true;
            ox = e.clientX - el.offsetLeft;
            oy = e.clientY - el.offsetTop;
        };

        document.onmousemove = function (e) {
            if (!dragging) return;
            el.style.left = clamp(e.clientX - ox, 0, window.innerWidth - 50) + "px";
            el.style.top = clamp(e.clientY - oy, 0, window.innerHeight - 50) + "px";
        };

        document.onmouseup = function () {
            dragging = false;
        };
    }

    /* =======================
       RENDER PANELS
    ======================= */
    /* ================= WAR SCAN ================= */

    var lastTargets = "";

    function scanFaction() {
        if (!settings.scan) return;
        var rows = document.body.textContent;
        var low = [], mid = [], high = [], avoid = [];

        var lvls = rows.match(/Level\s+\d+/gi) || [];
        for (var i = 0; i < lvls.length; i++) {
            var l = parseInt(lvls[i].replace(/\D/g, ""), 10);
            if (l < 25) low.push("L" + l);
            else if (l < 50) mid.push("L" + l);
            else if (l < 80) high.push("L" + l);
            else avoid.push("L" + l);
        }

        lastTargets =
            "LOW\n" + low.join(", ") + "\n\n" +
            "MID\n" + mid.join(", ") + "\n\n" +
            "HIGH\n" + high.join(", ") + "\n\n" +
            "AVOID\n" + avoid.join(", ");

        function render(){
    }

    /* ================= SIMULATOR ================= */

    function renderSim() {
        if (!settings.simulator) return;
        document.getElementById("sim").innerHTML =
            "Estimated Outcome:<br>" +
            "If LOW/MID focused → High win chance<br>" +
            "If HIGH engaged → Chain risk ↑";
    }

    /* ================= LOADOUT ================= */

    function renderLoadout() {
        if (!settings.loadout) return;
        document.getElementById("load").innerHTML =
            "LOW: Fast weapons, no boosters<br>" +
            "MID: Balanced loadout<br>" +
            "HIGH: Armor + boosters<br>" +
            "AVOID: Skip unless ordered";
    }

    /* ================= NOTES ================= */

    function publishNotes() {
        copy(
            "WAR TARGETS\n\n" +
            lastTargets + "\n\n" +
            "Updated: " + new Date().toLocaleString()
        );
    }

    function renderAnalytics() {
        document.getElementById("panel_analytics").innerHTML =
            "Hits: " + stats.hits + "<br>" +
            "Respect: " + stats.respect + "<br>" +
            "Money: $" + stats.money.toLocaleString() + "<br>" +
            "Xanax: " + stats.xanax + "<br>" +
            "Session: " + hoursSince(stats.start) + "h<br>" +
            "Efficiency: " + respectEfficiency() + " R/H";
    }

    function renderStatus() {
        document.getElementById("panel_status").innerHTML =
            "Compliance: " + complianceStatus() + "<br>" +
            "Inactivity: " + hoursSince(stats.lastActive) + "h<br>" +
            "Efficiency Rank: " + efficiencyRank() + "<br>" +
            "Xan Discipline: " + xanDiscipline();
    }

    function renderBank() {
        document.getElementById("panel_bank").innerHTML =
            "<button id='req_bank'>Request Withdrawal</button><br>" +
            stats.bankRequests.map(function (r, i) {
                return i + 1 + ". $" + r.amount + " [" + r.status + "]";
            }).join("<br>");
    }

    function renderWar() {
        document.getElementById("panel_war").innerHTML =
            "<button>Scan Enemy Faction</button><br>" +
            "<button>Simulate War</button><br>" +
            "Target grouping by efficiency (manual input)";
    }

    function renderOfficer() {
        document.getElementById("panel_officer").innerHTML =
            "<label><input type='checkbox' id='officer_toggle' " +
            (stats.officerMode ? "checked" : "") + "> Officer Mode</label>";
    }

    function renderAll() {
        renderAnalytics();
        renderStatus();
        renderBank();
        renderWar();
        renderOfficer();
    }

    /* =======================
       EVENTS
    ======================= */

    document.addEventListener("click", function () {
        stats.lastActive = Date.now();
        save();
    });

    document.addEventListener("click", function (e) {
        if (e.target.id === "req_bank") {
            var amt = prompt("Enter withdrawal amount:");
            if (!amt) return;
            stats.bankRequests.push({ amount: amt, status: "Pending" });
            save();
            renderBank();
        }

        if (e.target.id === "officer_toggle") {
            stats.officerMode = e.target.checked;
            save();
        }
    });

    /* =======================
       BOOT
    ======================= */

    function boot() {
        createDashboard();
        renderAll();
        setInterval(renderAll, 5000]};
