# FLOW — OAuth tab fallback

## Why a fallback?

`chrome.identity.launchWebAuthFlow` is the preferred Google OAuth path because it runs in a sandboxed window the user cannot tamper with. But on some Edge installs / older Chrome builds it returns `OAuth2 not granted` before any UI shows. In that case Volt falls back to opening a regular tab to the Google consent screen.

## Sequence

```
Popup --> BG.startGoogleOAuthFromBackground
              |
              |  Try chrome.identity.launchWebAuthFlow({url, interactive: true})
              |       /        \
              |  success       failure
              |     |              |
              |     v              v
              |  exchangeCode  fallback: chrome.tabs.create({url: googleAuthUrl})
              |                    |
              |                    v
              |                user authorizes in the tab
              |                    |
              |                    v
              |                Google redirects to chrome.identity.getRedirectURL('supabase-oauth')
              |                    |
              |                    v
              |                background.js intercepts via chrome.tabs.onUpdated
              |                    |
              |                    v
              |                exchangeCodeForSession(code)
              |                    |
              |                    v
              |                close fallback tab
```

## Security considerations

- The fallback tab is on `accounts.google.com` → user can verify the origin.
- The redirect target is the extension's own ID — Google rejects mismatches.
- `chrome.tabs.onUpdated` filters strictly by URL prefix before extracting the code.
- If the user closes the tab before authorizing, the popup shows a friendly retry.

## Files

- `background.js:297` — `startGoogleOAuthFromBackground`.
- `background.js` — `chrome.tabs.onUpdated` listener for the redirect.
- `popup.js:54` — popup glue.
