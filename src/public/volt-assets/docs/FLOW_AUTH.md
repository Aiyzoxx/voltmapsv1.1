# FLOW — Authentication

## Email magic link

```
User                Popup                BG (background.js)           Supabase Auth
 |     enter email   |                          |                          |
 |------------------>|                          |                          |
 |                   |  signInWithOtp(email)    |                          |
 |                   |------------------------->|  auth.signInWithOtp({})  |
 |                   |                          |------------------------->|
 |                   |                          |                          |--- sends email
 |  click link in email                         |                          |
 |---------------------------------------------------------------------->| /verify
 |                                                                       |
 |                   |   onAuthStateChange(SIGNED_IN, session)              |
 |                   |<-----------------------------------------------------|
 |                   |  setCachedAuthUser(user)                             |
 |                   |  syncFromCloud()  --> bg/scores.js                   |
 |                   |  ensureOAuthUserProfile() --> bg/social.js           |
 |                   |  rotate_my_hmac_secret() --> stored session-only     |
```

Tokens land in `supabase-js` storage adapter (chrome.storage.local). The popup never reads the JWT directly except via `atob(jwt.split('.')[1])` for `iat` freshness check (popup.js:3083) — no signature validation client-side.

## Google OAuth (PKCE)

```
User              Popup            BG                            Google                 Supabase Auth
 |    click G      |                |                              |                       |
 |---------------->|                |                              |                       |
 |                 |  oauthGoogle   |                              |                       |
 |                 |--------------->|                              |                       |
 |                 |                |  launchWebAuthFlow(authUrl)  |                       |
 |                 |                |----------------------------->|                       |
 |                 |                |                              |--- user consents --->|
 |                 |                |    redirectURL(code)         |                       |
 |                 |                |<-----------------------------|                       |
 |                 |                |  exchangeCodeForSession(code)|                       |
 |                 |                |------------------------------------------------------>|
 |                 |                |                                                       |
 |                 |   onAuthStateChange(SIGNED_IN, session)                                |
 |                 |<-------------------------------------------------------------------|
 |                 |  same post-login chain as magic-link path                              |
```

Redirect URL = `chrome.identity.getRedirectURL('supabase-oauth')`. Configured as an allowed redirect in the Supabase project console.

## Sign-out

```
Popup ----------> BG.auth.signOut() ---------> Supabase invalidates session
                       |
                       |   onAuthStateChange(SIGNED_OUT)
                       v
              _signedOutDebounceTimer (2.5 s) — re-checks session in case of false-positive
                       |
                       |   final cleanup:
                       v
            chrome.storage.local.remove(['id','pseudo','profilePic','bannerPic',
                                        'role','myTeamId','dynamicHmacKey',
                                        'unreadDmCount','pendingDM',
                                        'volt_profile_cache','volt_grade'])
            chrome.action.setBadgeText({text: ''})
            _cachedHmacKey = null
            voltAdminCacheClear()        # AUDIT Y.1
            setCloudSyncActive(false)
```

## Ban-time signout

If `checkBanForGameReset` finds `is_banned=true` or HWID blacklisted, the SW issues `chrome.storage.local.clear()` plus a `resetData` broadcast to all 4 game tabs.

## Files

- `background.js:297` — `startGoogleOAuthFromBackground`.
- `background.js:555-826` — `onAuthStateChange` handlers (login + logout).
- `popup.js:54` — popup OAuth glue.
- `bg/social.js:bootstrapAuthProfile` — first-login profile creation (whitelisted column set).
- `bg/scores.js:syncFromCloud` — preferences pull on login.
