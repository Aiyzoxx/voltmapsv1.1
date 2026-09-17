# FLOW — Teams & Clans

## Team creation

```
Owner popup --> BG.createTeam --> rpc('create_team', name, tag)
                               |--> RLS: pseudo unique + tag uppercase 2-6 chars
                               |--> INSERT teams (owner_uid)
                               |--> INSERT team_members (uid, role='owner')
```

## Join via invite

```
Sender (member) --> BG.sendTeamInvite --> rpc('send_team_invite', target_uid)
                                        |--> RLS: requires team_members.role IN ('owner','captain')
                                        |--> INSERT team_invites

Receiver --> BG.acceptTeamInvite --> rpc('accept_team_invite', invite_id)
                                  |--> FOR UPDATE team_invites
                                  |--> INSERT team_members
                                  |--> UPDATE status=accepted
                                  |--> safeLocalStorageSet({myTeamId})
```

## Team chat

```
Popup --> BG.sendTeamChatMessage --> assertTeamMembership(uid, team_id)
                                  |--> voltCleanRichText(text)
                                  |--> slowmode check
                                  |--> INSERT team_chat (whitelist: uid, team_id, text)
```

RLS on `team_chat` requires membership for both SELECT and INSERT.

## Team challenges

`team_challenges` table — pre-defined goals (X runs in 7 days, etc.). Progress aggregated server-side via cron-like trigger on `run_history` writes.

## Team leaderboard

Aggregated per-team ELO via `team_members` join — exposed by `get_team_leaderboard` RPC.

## Files

- `bg/teams.js` — team CRUD + chat + challenges (928 LOC).
- `popup_team_handler.js` — heavy popup handler lazy-loaded on `#section-team` activation.
- `ui/components/player-card.js` — used in team rosters.
