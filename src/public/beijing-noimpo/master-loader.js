"use strict";
var scriptUrl;
if (document.currentScript && document.currentScript.src) {
    scriptUrl = document.currentScript.src;
} else {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf("master-loader.js") !== -1) {
            scriptUrl = scripts[i].src;
            break;
        }
    }
    if (!scriptUrl) scriptUrl = scripts[scripts.length - 1].src;
}
var root = scriptUrl.split("master-loader.js")[0],
    loaders = {
        unity: "unity.js",
        "unity-beta": "unity-beta.js",
        "unity-2020": "unity-2020.js"
    };

if (0 <= window.location.href.indexOf("pokiForceLocalLoader") && (loaders.unity = "/unity/dist/unity.js", loaders["unity-beta"] = "/unity-beta/dist/unity-beta.js", loaders["unity-2020"] = "/unity-2020/dist/unity-2020.js", root = "/loaders"));
if (!window.config) throw Error("window.config not found");

var loader = loaders[window.config.loader];
if (!loader) throw Error('Loader "' + window.config.loader + '" not found');

if (!window.config.unityWebglLoaderUrl) {
    var versionSplit = window.config.unityVersion ? window.config.unityVersion.split(".") : [],
        year = versionSplit[0],
        minor = versionSplit[1];
    switch (year) {
        case "2019":
            window.config.unityWebglLoaderUrl = 1 === minor ? "UnityLoader.2019.1.js" : "UnityLoader.2019.2.js";
            break;
        default:
            window.config.unityWebglLoaderUrl = "UnityLoader.js";
    }
}

// Stub PokiSDK localement — évite la dépendance au CDN Poki
window.PokiSDK = {
    init: function() { return Promise.resolve(); },
    initWithVideoHB: function() { return Promise.resolve(); },
    commercialBreak: function() { return Promise.resolve(); },
    shareableURL: function() { return Promise.resolve(""); },
    getURLParam: function() { return Promise.resolve(""); },
    getLanguage: function() { return Promise.resolve("en"); },
    gameLoadingStart: function() {},
    gameLoadingFinished: function() {},
    gameInteractive: function() {},
    gameplayStart: function() {},
    gameplayStop: function() {},
    roundStart: function() {},
    roundEnd: function() {},
    happyTime: function() {},
    rewardedBreak: function() { return Promise.resolve(false); },
    customEvent: function() {},
    destroyAd: function() {},
    setDebug: function() {},
    gameLoadingProgress: function() {},
    logError: function() {},
    muteAd: function() {},
    disableProgrammatic: function() {},
    getLeaderboard: function() { return Promise.resolve({}); },
    setPlayerAge: function() {},
    togglePlayerAdvertisingConsent: function() {},
    toggleNonPersonalized: function() {},
    setConsentString: function() {},
    sendHighscore: function() {},
    setDebugTouchOverlayController: function() {}
};

// Charger Unity directement
var unityScript = document.createElement("script");
unityScript.src = root + loader;
unityScript.onload = function () {
    // window.onload a déjà tiré car unity.js est chargé dynamiquement après le chargement de la page.
    // On le déclenche manuellement pour que Unity s'initialise correctement.
    if (typeof window.onload === "function") {
        window.onload();
    }
};
document.body.appendChild(unityScript);