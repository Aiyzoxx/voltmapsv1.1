/*
 * pogo-hotkey.js  —  Press "E" (or "e") => activate the PogoStick powerup.
 *
 * BUILD ANALYSIS (Subway Surfers Havana, Unity 2019.4 IL2CPP WebGL):
 *   - Unity instance is exposed by unity.js  => window.unityGame
 *   - Bridge ABI (4399.js):
 *        window.unityGame.SendMessage(gameObjectName, methodName)        -> ccall SendMessage       (0-arg / void method)
 *        window.unityGame.SendMessage(gameObjectName, methodName, "str") -> ccall SendMessageString (1 string param)
 *        window.unityGame.SendMessage(gameObjectName, methodName,  123 ) -> ccall SendMessageFloat  (1 int/float param)
 *        (passing a JS boolean THROWS — there is no bool branch. Use 1/0 instead.)
 *   - Pogo activation lives on the IL2CPP class SYBO.Subway.Game (class name 'Game' @ metadata 0x474127):
 *        Game.PickupPogostick()  (metadata 0x4747c3) — full "powerup collected" path, seeds pogoLevel/pogoJumpsLeft
 *        Game.StartPogostick()   (metadata 0x4747d3) — leaner "begin pogostick mode" entry
 *     Both sit in an unbroken run with the parameterless PickupJetpack/StartJetpack, with NO interleaved
 *     param-name strings => almost certainly parameterless void. Numeric fallbacks try an int (pogoLevel) anyway.
 *   - State check (read-only): Game.get_IsInPogostickMode (0x4745ce) / IsInPogostickMode (0x474f70).
 *
 * UNKNOWN resolved AT RUNTIME: the *scene GameObject name* that carries the Game component is NOT a clean
 * plaintext scene string (only the IL2CPP class name 'Game' survives). So we try a ranked list of candidate
 * (object, method, arg) tuples. SendMessage returns nothing; if the object/method does not resolve, Unity logs
 * "SendMessage <obj> has no receiver!" (or "... has no method ...") to the console. Watch the console + the game.
 *
 * EXPOSED CONSOLE API:
 *   window.pogo()                      -> run the full ranked sequence once (spaced), best candidate first.
 *   window.pogoTry(obj, method, arg)   -> fire one exact tuple immediately (manual probing).
 *   window.pogoScan()                  -> alias of pogo(): walks every ranked tuple with delay, verbose logs.
 *   window.pogoStatus()                -> try to read IsInPogostickMode (best-effort; usually visual-only).
 *   window.POGO.set(obj, method, arg)  -> lock the winning tuple so E uses only it from then on.
 *   window.POGO                        -> live config { obj, method, arg, key, verbose, locked }.
 *
 * NOTE on confirmation: SendMessage cannot return a value to JS, so IsInPogostickMode cannot be read directly
 * through the bridge. pogoStatus() attempts an indirect read only if the build happens to expose a JS hook;
 * otherwise confirmation is VISUAL (character mounts the pogostick). Each attempt is logged so the tuple fired
 * immediately before the visible activation is the winner.
 */
(function () {
  'use strict';

  // ----------------------------------------------------------------------------
  // Ranked candidate tuples — best first. Each: [gameObject, method, arg]
  //   arg === undefined  -> void SendMessage (preferred for the parameterless methods)
  //   arg is a number    -> SendMessageFloat (covers a hidden int 'pogoLevel' param)
  // Ranking rationale:
  //   1-2  Game/PickupPogostick|StartPogostick   ('Game' is the literal class name; best guess for the GO name)
  //   3-4  Character/*                            ('Character' is the one CONFIRMED scene string @0x17da315)
  //   5-12 other plausible manager/host names (GameController, GameManager, Subway, World, Main...)
  //   13-16 numeric-arg fallbacks in case Start/PickupPogostick take an int level (pogoLevel=1)
  // ----------------------------------------------------------------------------
  var RANKED = [
    ['Game',           'PickupPogostick', undefined],
    ['Game',           'StartPogostick',  undefined],
    ['Character',      'PickupPogostick', undefined],
    ['Character',      'StartPogostick',  undefined],
    ['GameController', 'PickupPogostick', undefined],
    ['GameController', 'StartPogostick',  undefined],
    ['GameManager',    'PickupPogostick', undefined],
    ['GameManager',    'StartPogostick',  undefined],
    ['Subway',         'PickupPogostick', undefined],
    ['Subway',         'StartPogostick',  undefined],
    ['World',          'StartPogostick',  undefined],
    ['Main',           'StartPogostick',  undefined],
    // numeric-arg fallbacks (in case of a hidden int pogoLevel param)
    ['Game',           'StartPogostick',  1],
    ['Game',           'PickupPogostick', 1],
    ['Character',      'StartPogostick',  1],
    ['Character',      'PickupPogostick', 1]
  ];

  // Live, console-tweakable config. Defaults to the #1 ranked tuple.
  window.POGO = window.POGO || {
    obj:     RANKED[0][0],     // GameObject name holding the Game component
    method:  RANKED[0][1],     // PickupPogostick (full path) by default
    arg:     RANKED[0][2],     // undefined => void SendMessage
    key:     'e',              // trigger key (case-insensitive)
    verbose: true,             // console.log each attempt
    locked:  true              // locked on Game/PickupPogostick: E fires exactly ONE SendMessage, no sweep
  };

  function log() {
    if (window.POGO.verbose) console.log.apply(console, ['[pogo]'].concat([].slice.call(arguments)));
  }
  function warn() {
    console.warn.apply(console, ['[pogo]'].concat([].slice.call(arguments)));
  }

  // ---- Unity readiness (window.unityGame is only set AFTER the loader script loads) ----
  function ready() {
    return !!(window.unityGame && typeof window.unityGame.SendMessage === 'function');
  }
  function whenReady(cb) {
    if (ready()) return cb();
    var iv = setInterval(function () {
      if (ready()) { clearInterval(iv); log('window.unityGame ready — SendMessage available'); cb(); }
    }, 250); // 250ms poll, matches the Poki-bridge guard pattern used elsewhere in this build
  }

  // ---- Single bridge send, honoring the exact ABI (omit=void, number=float, string=string) ----
  function send(obj, method, arg) {
    if (!ready()) { warn('not ready — window.unityGame absent'); return false; }
    try {
      if (arg === undefined || arg === null || arg === '') {
        window.unityGame.SendMessage(obj, method);
        log('SendMessage("' + obj + '", "' + method + '")  [void]');
      } else if (typeof arg === 'boolean') {
        // ABI has no boolean branch — coerce to 1/0 (SendMessageFloat).
        window.unityGame.SendMessage(obj, method, arg ? 1 : 0);
        log('SendMessage("' + obj + '", "' + method + '", ' + (arg ? 1 : 0) + ')  [bool->float]');
      } else {
        window.unityGame.SendMessage(obj, method, arg); // string->SendMessageString, number->SendMessageFloat
        log('SendMessage("' + obj + '", "' + method + '", ' + JSON.stringify(arg) + ')  [' +
            (typeof arg === 'number' ? 'float' : 'string') + ']');
      }
      return true;
    } catch (e) {
      warn('SendMessage threw for', obj, method, arg, '->', e && e.message);
      return false;
    }
  }

  // ---- Best-effort state read (SendMessage cannot return a value; this only works if a JS hook exists) ----
  // Returns true/false/null(unknown). Most builds: returns null (read it visually instead).
  window.pogoStatus = function () {
    try {
      var g = window.unityGame;
      // IsInPogostickMode is an instance property with no exported C entry point, so there is normally
      // no synchronous JS path. We probe a couple of optional, harmless hooks and otherwise report unknown.
      if (g && g.Module && typeof g.Module.IsInPogostickMode === 'function') {
        var v = !!g.Module.IsInPogostickMode();
        log('IsInPogostickMode (Module hook) =', v);
        return v;
      }
      if (typeof window.__pogoIsActive === 'function') {
        var w = !!window.__pogoIsActive();
        log('IsInPogostickMode (window hook) =', w);
        return w;
      }
    } catch (e) { /* ignore */ }
    log('IsInPogostickMode: no JS read path in this build — confirm VISUALLY (character on the pogostick).');
    return null;
  };

  // ---- Public: fire the current locked config tuple ----
  function fireCurrent() {
    var ok = send(window.POGO.obj, window.POGO.method, window.POGO.arg);
    setTimeout(window.pogoStatus, 250);
    return ok;
  }

  // ---- Public: run the full ranked sequence (used when not yet locked, or on demand) ----
  function fireRanked(done) {
    log('running ranked sequence (' + RANKED.length + ' tuples, ~' +
        (RANKED.length * 0.6).toFixed(0) + 's). Watch the character + console.');
    var i = 0;
    (function next() {
      if (i >= RANKED.length) {
        log('ranked sequence done. If the character mounted the pogostick, note the tuple logged just before it,');
        log('then lock it: window.POGO.set("<obj>","<method>"[,<arg>])  e.g. window.POGO.set("Game","PickupPogostick")');
        if (typeof done === 'function') done();
        return;
      }
      var c = RANKED[i++];
      log('--> attempt #' + i + '/' + RANKED.length);
      send(c[0], c[1], c[2]);
      setTimeout(next, 600);
    })();
  }

  // ---- Console API ----
  // window.pogo(): if locked -> fire the single tuple; else -> walk the ranked sequence.
  window.pogo = function () {
    if (window.POGO.locked) return fireCurrent();
    fireRanked();
    return true;
  };
  // Alias kept for muscle-memory / earlier docs.
  window.pogoScan = function () { fireRanked(); };

  // Manual single-tuple probe.
  window.pogoTry = function (obj, method, arg) { return send(obj, method, arg); };

  // Lock the winning tuple: from then on E (and window.pogo()) fire ONLY this one.
  window.POGO.set = function (obj, method, arg) {
    window.POGO.obj = obj;
    window.POGO.method = method;
    window.POGO.arg = arg;
    window.POGO.locked = true;
    log('LOCKED config => SendMessage("' + obj + '","' + method + '"' +
        (arg === undefined ? '' : ',' + JSON.stringify(arg)) + '). E now fires only this tuple.');
  };

  // ---- Hotkey E ----
  function isTyping(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable;
  }

  whenReady(function () {
    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;                                   // ignore key-hold autorepeat
      if (isTyping(e.target)) return;                         // ignore while typing in a field
      var k = (e.key || '').toLowerCase();
      if (k !== (window.POGO.key || 'e').toLowerCase()) return;
      log('key "' + window.POGO.key + '" pressed => activating pogo');
      window.pogo();
    }, true); // capture phase: see the key before the game's own handlers swallow it

    log('ready. Press "' + window.POGO.key + '" to activate pogo.');
    log('If nothing happens: run window.pogo() (sweeps ranked tuples), watch the character,');
    log('then lock the winner with window.POGO.set("Game","PickupPogostick").');
    log('Manual probe: window.pogoTry("Character","StartPogostick").');
  });
})();
