// ==UserScript==
// @name         Dystopia Faction OS FINAL
// @namespace    https://torn.com/dystopia
// @version      4.0.0
// @match        https://www.torn.com/*
// @downloadURL  https://raw.githubusercontent.com/you/dystopia/script.user.js
// @updateURL    https://raw.githubusercontent.com/you/dystopia/script.user.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {

    var SYNC_URL = "https://github.com/curtdahurt/dystopia-faction/raw/main/data.json";
    var REFRESH = 30000;

    // ---------------- UI ----------------
    GM_addStyle(
        "#dystopia{position:fixed;top:70px;right:10px;width:360px;background:#0b0b0b;color:#0f0;" +
        "font-family:monospace;border:2px solid #0f0;padding:8px;z-index:9999}" +
        "#dystopia textarea{width:100%;background:#000;color:#0f0;border:1px solid #0f0;margin-bottom:4px}" +
        "#dystopia button{width:100%;background:#060;color:white;border:none;padding:4px;margin-bottom:4px}" +
        "#d-header{cursor:pointer;text-align:center;background:#020;padding:4px;font-weight:bold}" +
        ".hidden{display:none}"
    );

    var panel = document.createElement("div");
    panel.id = "dystopia";
    panel.innerHTML =
        "<div id='d-header'>DYSTOPIA FACTION OS</div>" +
        "<div id='d-body'>" +
        "<b>WAR TARGETS</b><textarea id='t' rows='3'></textarea>" +
        "<b>SPY DATABASE</b><textarea id='s' rows='3'></textarea>" +
        "<b>FACTION NOTES</b><textarea id='n' rows='3'></textarea>" +
        "<b>PLAYER ANALYTICS</b><div id='analytics'></div>" +
        "<button id='xanax'>LOG XANAX</button>" +
        "<button id='reset'>RESET STATS</button>" +
        "<button id='save'>SAVE</button>" +
        "</div>";

    document.body.appendChild(panel);

    var T = document.getElementById("t");
    var S = document.getElementById("s");
    var N = document.getElementById("n");
    var A = document.getElementById("analytics");

    document.getElementById("d-header").onclick = function () {
        document.getElementById("d-body").className =
            document.getElementById("d-body").className === "hidden" ? "" : "hidden";
    };

    // ---------------- Shared Load ----------------
    function loadShared() {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", SYNC_URL + "?t=" + new Date().getTime(), true);
            xhr.onload = function () {
                var data = JSON.parse(xhr.responseText);
                T.value = data.targets || "";
                S.value = data.spies || "";
                N.value = data.notes || "";
            };
            xhr.send();
        } catch (e) {}
    }

    // ---------------- Analytics ----------------
    var stats = GM_getValue("stats", {
        hits: 0,
        respect: 0,
        money: 0,
        xanax: 0,
        start: new Date().getTime()
    });

    function renderAnalytics() {
        var hours = ((new Date().getTime() - stats.start) / 3600000).toFixed(2);
        A.innerHTML =
            "Hits: " + stats.hits + "<br>" +
            "Respect: " + stats.respect + "<br>" +
            "Money: $" + stats.money + "<br>" +
            "Xanax: " + stats.xanax + "<br>" +
            "Session: " + hours + "h<br>" +
            "Eff: " + (stats.respect / Math.max(stats.hits, 1)).toFixed(2) + " R/H";
    }

    function detectCombat() {
        var results = document.getElementsByClassName("result");
        if (!results || results.length === 0) return;

        var text = results[0].textContent;

        if (text.indexOf("You hit") !== -1) stats.hits++;

        if (text.indexOf("respect") !== -1) {
            var r = text.match(/([\d.]+) respect/);
            if (r) stats.respect += parseFloat(r[1]);
        }

        if (text.indexOf("$") !== -1) {
            var m = text.match(/\$([\d,]+)/);
            if (m) stats.money += parseInt(m[1].replace(/,/g, ""), 10);
        }

        GM_setValue("stats", stats);
        renderAnalytics();
    }

    // ---------------- Spy Button ----------------
    function addSpyButton() {
        if (location.href.indexOf("profiles.php") === -1) return;
        if (document.getElementById("dystopia-spy-btn")) return;

        var btn = document.createElement("button");
        btn.id = "dystopia-spy-btn";
        btn.innerHTML = "SAVE SPY TO DYSTOPIA";
        btn.style.background = "#060";
        btn.style.color = "#fff";
        btn.style.margin = "6px";

        btn.onclick = function () {
            var box = document.querySelector(".profile-spy") || document.body;
            var nameEl = document.getElementsByTagName("h4")[0];
            var name = nameEl ? nameEl.textContent : "Unknown";
            var text = box.textContent.replace(/\n+/g, " ");
            S.value = S.value + "\n" + name + " | " + text;
            alert("Spy saved for " + name);
        };

        document.body.insertBefore(btn, document.body.firstChild);
    }

    // ---------------- Buttons ----------------
    document.getElementById("xanax").onclick = function () {
        stats.xanax++;
        GM_setValue("stats", stats);
        renderAnalytics();
    };

    document.getElementById("reset").onclick = function () {
        stats = { hits:0,respect:0,money:0,xanax:0,start:new Date().getTime() };
        GM_setValue("stats", stats);
        renderAnalytics();
    };

    document.getElementById("save").onclick = function () {
        alert("Read-only client.\nOfficers update GitHub.");
    };

    // ---------------- Init ----------------
    loadShared();
    renderAnalytics();

    setInterval(loadShared, REFRESH);
    setInterval(detectCombat, 2000);
    setInterval(addSpyButton, 2000);

})();
