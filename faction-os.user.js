// ==UserScript==
// @name         Dystopia Faction OS PRO
// @namespace    https://torn.com/dystopia
// @version      2.0.0
// @description  Central faction dashboard with GitHub auto-sync
// @author       Dystopia
// @match        https://www.torn.com/*
// @grant        GM_addStyle
// ==/UserScript==

(async function () {
    'use strict';

    const SYNC_URL = "https://raw.githubusercontent.com/curtdahurt/dystopia-faction/main/data.json"; // raw github json
    const REFRESH = 30000;

    let data = { targets:"", spies:"", notes:"" };

    GM_addStyle(`
        #dystopia {
            position: fixed;
            top: 80px;
            right: 10px;
            width: 340px;
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
        }
    `);

    const ui = document.createElement("div");
    ui.id = "dystopia";
    ui.innerHTML = `
        <b>DYSTOPIA FACTION OS</b><br><br>

        <b>WAR TARGETS</b>
        <textarea id="t" rows="4"></textarea>

        <b>SPY DATABASE</b>
        <textarea id="s" rows="4"></textarea>

        <b>FACTION NOTES</b>
        <textarea id="n" rows="4"></textarea>

        <button id="save">SAVE TO FACTION</button>
    `;
    document.body.appendChild(ui);

    const T = t, S = s, N = n;

    async function load() {
        try {
            const res = await fetch(SYNC_URL + "?t=" + Date.now());
            data = await res.json();
            T.value = data.targets || "";
            S.value = data.spies || "";
            N.value = data.notes || "";
        } catch(e) {}
    }

    async function save() {
        alert("This version is read-only.\nOfficers update via GitHub.");
    }

    save.onclick = save;
    await load();
    setInterval(load, REFRESH);

})();
