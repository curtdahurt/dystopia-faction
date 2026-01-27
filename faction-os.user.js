// ==UserScript==
// @name         Dystopia Faction OS PRO + Analytics
// @namespace    https://torn.com/dystopia
// @version      3.0.0
// @description  Faction OS with war board, spy DB, notes, and player performance analytics
// @author       Dystopia
// @match        https://www.torn.com/*
// @downloadURL https://raw.githubusercontent.com/you/dystopia/script.user.js
// @updateURL   https://raw.githubusercontent.com/you/dystopia/script.user.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(async function () {
    'use strict';

    const SYNC_URL = "PUT_RAW_URL_HERE";
    const REFRESH = 30000;

    let data = { targets:"", spies:"", notes:"" };

    // ---------- UI ----------
    GM_addStyle(` #dystopia-header {
    cursor: pointer;
    font-weight: bold;
    text-align: center;
    margin-bottom: 6px;
    background: #020;
    padding: 4px;
}
.hidden {
    display: none;
}

    
        #dystopia {
            position: fixed;
            top: 70px;
            right: 10px;
            width: 360px;
            background: #0b0b0b;
            color: #0f0;
            font-family: monospace;
            border: 2px solid #0f0;
            padding: 10px;
            z-index: 9999;
        }
        #dystopia textarea {
            width: 100%;
            background: #000;
            color: #0f0;
            border: 1px solid #0f0;
            margin-bottom: 6px;
        }
        #dystopia button {
            width: 100%;
            background: #060;
            color: white;
            border: none;
            padding: 4px;
            cursor: pointer;
            margin-bottom: 4px;
        }
        #analytics div {
            font-size: 11px;
            margin-bottom: 2px;
        }
    `);

    const ui = document.createElement("div");
    ui.id = "dystopia";
    ui.innerHTML = `
    <div id="dystopia-header">DYSTOPIA FACTION OS (click)</div>
    <div id="dystopia-body">

        <b>WAR TARGETS</b>
        <textarea id="t" rows="3"></textarea>

        <b>SPY DATABASE</b>
        <textarea id="s" rows="3"></textarea>

        <b>FACTION NOTES</b>
        <textarea id="n" rows="3"></textarea>

        <b>PLAYER ANALYTICS</b>
        <div id="analytics"></div>
        <button id="xanax">LOG XANAX</button>
        <button id="reset">RESET STATS</button>

        <button id="save">SAVE</button>
    </div>
`;
document.getElementById("dystopia-header").onclick = () => {
    document.getElementById("dystopia-body").classList.toggle("hidden");
};

    `;
    document.body.appendChild(ui);

    const T = t, S = s, N = n, A = analytics;

    // ---------- Shared Load ----------
    async function loadShared() {
        try {
            const res = await fetch(SYNC_URL + "?t=" + Date.now());
            data = await res.json();
            T.value = data.targets || "";
            S.value = data.spies || "";
            N.value = data.notes || "";
        } catch {}
    }

    // ---------- Analytics Engine ----------
    let stats = GM_getValue("stats", {
        hits: 0,
        respect: 0,
        money: 0,
        xanax: 0,
        start: Date.now()
    });

    function renderAnalytics() {
    const hours = ((Date.now() - stats.start) / 3600000).toFixed(2);

    A.innerHTML =
        "<div>Hits: " + stats.hits + "</div>" +
        "<div>Respect: " + stats.respect + "</div>" +
        "<div>Money: $" + stats.money.toLocaleString() + "</div>" +
        "<div>Xanax: " + stats.xanax + "</div>" +
        "<div>Session: " + hours + "h</div>" +
        "<div>Eff: " + (stats.respect / Math.max(stats.hits,1)).toFixed(2) + " R/H</div>";
}

        `;
    }

    // Auto-detect attack results
    function detectCombat() {
        const result = document.querySelector(".result");
        if (!result) return;

        if (result.textContent.includes("You hit")) {
            stats.hits++;
        }
        if (result.textContent.includes("respect")) {
            const r = result.textContent.match(/([\d.]+) respect/);
            if (r) stats.respect += parseFloat(r[1]);
        }
        if (result.textContent.includes("$")) {
            const m = result.textContent.match(/\$([\d,]+)/);
            if (m) stats.money += parseInt(m[1].replace(/,/g,""));
        }

        GM_setValue("stats", stats);
        renderAnalytics();
    }

    setInterval(detectCombat, 2000);

    // Xanax button
    xanax.onclick = () => {
        stats.xanax++;
        GM_setValue("stats", stats);
        renderAnalytics();
    };

    // Reset
    reset.onclick = () => {
        stats = { hits:0, respect:0, money:0, xanax:0, start:Date.now() };
        GM_setValue("stats", stats);
        renderAnalytics();
    };

    // Save (read-only model)
    save.onclick = () => {
        alert("Read-only client.\nOfficers update GitHub.");
    };

    // Init
    await loadShared();
    renderAnalytics();
    setInterval(loadShared, REFRESH);

})();
