// ============================================================
// bg/teams.js — Volt Extension v16
// Handles: all team management, team chat, and daily challenges
// ============================================================

// Phase 5 hardening: team chat is private to team members and has a
// lightweight background slowmode to prevent duplicate sends/double-click spam.
const _VOLT_TEAM_CHAT_SLOWMODE_MS = 2000;
const _voltTeamChatSendTimes = new Map();

function _voltTeamChatCleanText(value, max = 500) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, max);
}

function _voltTeamChatCanSend(userId, teamId) {
  const key = `${String(userId || 'anon')}:${String(teamId || 'team')}`;
  const now = Date.now();
  const last = Number(_voltTeamChatSendTimes.get(key) || 0);
  if (last && now - last < _VOLT_TEAM_CHAT_SLOWMODE_MS) {
    return { ok: false, remainingMs: _VOLT_TEAM_CHAT_SLOWMODE_MS - (now - last) };
  }
  _voltTeamChatSendTimes.set(key, now);
  for (const [k, ts] of _voltTeamChatSendTimes.entries()) {
    if (!ts || now - Number(ts) > 10 * 60 * 1000) _voltTeamChatSendTimes.delete(k);
  }
  return { ok: true, remainingMs: 0 };
}

function _voltTeamChatReleaseSendGate(userId, teamId) {
  try { _voltTeamChatSendTimes.delete(`${String(userId || 'anon')}:${String(teamId || 'team')}`); } catch (_) {}
}

function _voltTeamsLooksLikeSchemaDrift(error) {
  const code = String(error?.code || '').toLowerCase();
  const msg = String(error?.message || error || '').toLowerCase();
  return code === '42703' || code === 'pgrst200' || code === 'pgrst204' || code === 'pgrst205'
    || msg.includes('column') || msg.includes('schema cache') || msg.includes('relationship') || msg.includes('foreign key');
}


/**
 * @param {string} action
 * @param {object} message
 * @param {function} sendResponse
 * @param {object} ctx — { supabaseClient, waitForAuthUser, initTeamChatBackground, incrementChallengeByType, getTodayChallenges, log }
 * @returns {boolean} true if action was handled
 */
self.handleTeams = async function(action, message, sendResponse, ctx) {
  const { supabaseClient, waitForAuthUser, initTeamChatBackground, incrementChallengeByType, getTodayChallenges, log } = ctx;
  if (!supabaseClient) return false;

  // Helper to prevent "Invalid input syntax for type uuid" errors
  const isValidUUID = self.voltIsValidUUID;

  const rejectInvalidTeamId = () => {
    sendResponse({ success: false, error: 'invalid_team_id' });
    return true;
  };

  const rejectInvalidTargetUid = () => {
    sendResponse({ success: false, error: 'invalid_target_uid' });
    return true;
  };
  const rejectInvalidRequestId = () => {
    sendResponse({ success: false, error: 'invalid_request_id' });
    return true;
  };
  const clampInteger = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
  };
  const storageSet = async (values) => {
    try { await chrome.storage.local.set(values); }
    catch (_) {}
  };
  const storageRemove = async (keys) => {
    try { await chrome.storage.local.remove(keys); }
    catch (_) {}
  };

  const safeUUIDList = (ids) => Array.from(new Set((ids || []).filter(isValidUUID)));
  const publicProfileSelect = 'id, pseudo, username, profilePic, userLevel, grade, grade_badge, grade_color, grade_color_mode, grade_color_2, grade_color_angle';
  const roleWeight = { owner: 0, officer: 1, member: 2 };

  function normalizePublicTeamMemberRow(row) {
    if (!row || !row.user_id) return null;
    const profilePic = row.profilePic ?? row.profile_pic ?? row.profilepic ?? null;
    const userLevel = row.userLevel ?? row.user_level ?? 1;
    return {
      user_id: row.user_id,
      role: row.role || 'member',
      joined_at: row.joined_at || null,
      best_score: Number(row.best_score || 0) || 0,
      users: {
        id: row.id || row.user_id,
        pseudo: row.pseudo || row.username || 'Anonyme',
        username: row.username || null,
        profilePic,
        userLevel,
        grade: row.grade || null,
        grade_badge: row.grade_badge || null,
        grade_color: row.grade_color || null,
        grade_color_mode: row.grade_color_mode || null,
        grade_color_2: row.grade_color_2 || null,
        grade_color_angle: row.grade_color_angle ?? null,
      },
    };
  }

  function sortTeamMembersForDisplay(members) {
    return (members || []).slice().sort((a, b) => {
      const byRole = (roleWeight[a.role] ?? 9) - (roleWeight[b.role] ?? 9);
      if (byRole) return byRole;
      const byScore = (b.best_score || 0) - (a.best_score || 0);
      if (byScore) return byScore;
      return String(a.users?.pseudo || '').localeCompare(String(b.users?.pseudo || ''));
    });
  }

  async function loadTeamMembersFromRpc(teamId) {
    if (!isValidUUID(teamId)) return null;
    try {
      const { data, error } = await supabaseClient.rpc('get_public_team_members', {
        p_team_id: teamId,
        p_category: 'no_coin_record'
      });
      if (error) {
        // The SQL patch may not be installed yet. Keep the extension usable with the direct fallback below.
        log?.('[VOLT Teams] public members RPC skipped:', error?.message || error);
        return null;
      }
      if (!Array.isArray(data)) return null;
      return sortTeamMembersForDisplay(data.map(normalizePublicTeamMemberRow).filter(Boolean));
    } catch (e) {
      log?.('[VOLT Teams] public members RPC unavailable:', e?.message || e);
      return null;
    }
  }

  async function loadTeamMembersExplicit(teamId) {
    if (!isValidUUID(teamId)) return [];

    const rpcMembers = await loadTeamMembersFromRpc(teamId);
    if (Array.isArray(rpcMembers)) return rpcMembers;

    const { data: rows, error: membersErr } = await supabaseClient
      .from('team_members')
      .select('user_id, role, joined_at')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });
    if (membersErr) throw membersErr;

    const members = rows || [];
    const ids = safeUUIDList(members.map((m) => m.user_id));
    const usersById = new Map();
    const bestById = new Map();

    if (ids.length) {
      const { data: profiles, error: profilesErr } = await supabaseClient
        .from('profiles')
        .select(publicProfileSelect)
        .in('id', ids);

      if (!profilesErr) {
        (profiles || []).forEach((u) => usersById.set(u.id, u));
      } else {
        log?.('[VOLT Teams] profiles fallback skipped:', profilesErr?.message || profilesErr);
        const { data: users, error: usersErr } = await supabaseClient
          .from('users')
          .select(publicProfileSelect)
          .in('id', ids);
        if (!usersErr) {
          (users || []).forEach((u) => usersById.set(u.id, u));
        } else {
          log?.('[VOLT Teams] users profile fallback skipped:', usersErr?.message || usersErr);
        }
      }

      const { data: scores, error: scoresErr } = await supabaseClient
        .from('scores')
        .select('user_id, time, category, created_at')
        .in('user_id', ids)
        .eq('category', 'no_coin_record')
        .order('time', { ascending: false });

      if (!scoresErr) {
        for (const score of (scores || [])) {
          const uid = score?.user_id;
          const time = Number(score?.time || 0) || 0;
          if (!uid) continue;
          if (!bestById.has(uid) || time > bestById.get(uid)) bestById.set(uid, time);
        }
      } else {
        log?.('[VOLT Teams] scores fallback skipped:', scoresErr?.message || scoresErr);
      }
    }

    return sortTeamMembersForDisplay(members.map((m) => ({
      ...m,
      users: usersById.get(m.user_id) || {
        id: m.user_id,
        pseudo: 'Anonyme',
        username: null,
        profilePic: null,
        userLevel: 1,
        grade: null,
      },
      best_score: bestById.get(m.user_id) || 0,
    })));
  }

  async function loadTeamExplicit(teamId) {
    if (!isValidUUID(teamId)) return null;
    const { data: team, error: teamErr } = await supabaseClient
      .from('teams')
      .select('id, name, tag, description, icon, owner_id, max_members, is_public, wins, created_at, updated_at')
      .eq('id', teamId)
      .maybeSingle();
    if (teamErr) throw teamErr;
    if (!team) return null;
    team.max_members = clampInteger(team.max_members, 1, 500, 5);
    team.team_members = await loadTeamMembersExplicit(teamId);
    return team;
  }

  async function assertTeamMembership(teamId, userId) {
    if (!isValidUUID(teamId) || !isValidUUID(userId)) return null;
    const { data, error } = await supabaseClient
      .from('team_members')
      .select('team_id, role, joined_at')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  switch (action) {

    case 'getMyTeam': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data: membership, error: membershipErr } = await supabaseClient
          .from('team_members')
          .select('team_id, role, joined_at')
          .eq('user_id', user.id)
          .maybeSingle();
        if (membershipErr) throw membershipErr;

        if (!membership) {
          const { data: invites, error: invitesErr } = await supabaseClient
            .from('team_invites')
            .select(`
              id, status, created_at, expires_at,
              teams(id, name, tag, icon),
              users!team_invites_from_uid_fkey(pseudo, profilePic)
            `)
            .eq('to_uid', user.id)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });
          if (invitesErr) throw invitesErr;
          sendResponse({ success: true, team: null, invites: invites || [] });
          return true;
        }

        const team = await loadTeamExplicit(membership.team_id);
        if (!team) {
          // Do not delete database membership here: just avoid a broken UI when
          // a stale membership points to a missing/inaccessible team row.
          await storageRemove('myTeamId');
          sendResponse({ success: true, team: null, invites: [], myRole: null, staleMembership: true });
          return true;
        }

        if (membership.team_id) initTeamChatBackground(membership.team_id);
        sendResponse({ success: true, team, myRole: membership.role });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getTeamMembers': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.teamId)) return rejectInvalidTeamId();
        const membership = await assertTeamMembership(message.teamId, user.id);
        if (!membership) { sendResponse({ success: false, error: 'not_team_member' }); return true; }
        const members = await loadTeamMembersExplicit(message.teamId);
        sendResponse({ success: true, members });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getTeamInternalRanking': {
      const user = await waitForAuthUser();
      try {
        if (!isValidUUID(message.teamId)) return rejectInvalidTeamId();

        const { data: team, error: teamErr } = await supabaseClient
          .from('teams')
          .select('id, is_public')
          .eq('id', message.teamId)
          .maybeSingle();
        if (teamErr) throw teamErr;

        let membership = null;
        if (user?.id) {
          try {
            membership = await assertTeamMembership(message.teamId, user.id);
          } catch (membershipErr) {
            if (!team?.is_public) throw membershipErr;
            log?.('[VOLT Teams] membership check skipped for public team:', membershipErr?.message || membershipErr);
          }
        }

        if (!team && !membership) {
          sendResponse({ success: false, error: user ? 'team_not_found_or_private' : 'not_logged_in' });
          return true;
        }
        if (team?.is_public !== true && !membership) {
          sendResponse({ success: false, error: user ? 'not_team_member' : 'not_logged_in' });
          return true;
        }

        const processed = await loadTeamMembersExplicit(message.teamId);
        sendResponse({ success: true, members: processed, publicView: !membership });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'createTeam': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('create_team', {
          p_name: message.name,
          p_tag: message.tag,
          p_description: message.description || null,
          p_icon: message.icon || 'fa-solid fa-bolt',
          p_is_public: message.is_public !== false
        });
        if (error) throw error;
        if (data?.success && data.team_id) {
          await storageSet({ myTeamId: data.team_id });
          initTeamChatBackground(data.team_id);
        }
        sendResponse(data);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'searchTeams': {
      try {
        const q = String(message.query || '').trim().slice(0, 40);
        const queryBuilder = supabaseClient
          .from('teams')
          .select(`
            id, name, tag, icon, description, max_members,
            team_members(count)
          `)
          .limit(20);

        if (q.length >= 2) {
          const safeQ = q.replace(/[%_\\]/g, c => `\\${c}`);
          queryBuilder.or(`name.ilike.%${safeQ}%,tag.ilike.%${safeQ}%`);
        } else {
          queryBuilder.order('created_at', { ascending: false });
        }

        const { data, error } = await queryBuilder;
        if (error) throw error;
        sendResponse({ success: true, teams: data || [] });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'buyTeamSlots': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const slots = clampInteger(message.slots, 1, 45, 5);
        if (!isValidUUID(message.teamId)) {
          return rejectInvalidTeamId();
        }
        const { data, error } = await supabaseClient.rpc('buy_team_slots', {
          p_team_id: message.teamId,
          p_slots: slots
        });
        if (error) throw error;
        sendResponse(data);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'inviteToTeam': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.teamId)) {
          return rejectInvalidTeamId();
        }
        let targetUid = message.targetUid;
        if (!targetUid && message.targetPseudo) {
          const { data: target } = await supabaseClient
            .from('users')
            .select('id')
            .eq('pseudo', message.targetPseudo)
            .maybeSingle();
          if (!target) { sendResponse({ success: false, error: 'user_not_found' }); return true; }
          targetUid = target.id;
        }
        if (!isValidUUID(targetUid)) return rejectInvalidTargetUid();
        const { data, error } = await supabaseClient.rpc('invite_to_team', {
          p_team_id: message.teamId,
          p_to_uid: targetUid
        });
        if (error) throw error;
        sendResponse(data);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'acceptTeamInvite': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.inviteId)) return rejectInvalidRequestId();
        const { data, error } = await supabaseClient.rpc('accept_team_invite', {
          p_invite_id: message.inviteId
        });
        if (error) throw error;
        if (data?.success && data.team_id) {
          await storageSet({ myTeamId: data.team_id });
          initTeamChatBackground(data.team_id);
        }
        sendResponse(data);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'declineTeamInvite': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.inviteId)) return rejectInvalidRequestId();
        const { data, error } = await supabaseClient.rpc('decline_team_invite', {
          p_invite_id: message.inviteId
        });
        if (!error && data) {
          sendResponse(data);
          return true;
        }

        const fallback = await supabaseClient
          .from('team_invites')
          .update({ status: 'declined' })
          .eq('id', message.inviteId)
          .eq('to_uid', user.id);
        if (fallback.error) throw (error || fallback.error);
        sendResponse({ success: true, degraded: true });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'requestToJoinTeam': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.teamId)) {
          return rejectInvalidTeamId();
        }
        const { data, error } = await supabaseClient.rpc('request_to_join_team', {
          p_team_id: message.teamId
        });
        if (error) throw error;
        sendResponse(data);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getTeamRequests': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.teamId)) {
          return rejectInvalidTeamId();
        }
        const { data, error } = await supabaseClient
          .from('team_requests')
          .select(`
            id, status, created_at,
            users(id, pseudo, profilePic, userLevel, grade, grade_color, grade_color_mode, grade_color_2, grade_color_angle)
          `)
          .eq('team_id', message.teamId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;
        sendResponse({ success: true, requests: data || [] });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'handleTeamRequest': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.requestId)) return rejectInvalidRequestId();
        if (!['accepted', 'declined'].includes(message.status)) {
          sendResponse({ success: false, error: 'invalid_status' });
          return true;
        }
        const { data, error } = await supabaseClient.rpc('handle_team_request', {
          p_request_id: message.requestId,
          p_status: message.status
        });
        if (error) throw error;
        sendResponse(data);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getMyTeamInvites': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient
          .from('team_invites')
          .select(`
            id, status, created_at, expires_at,
            teams(id, name, tag, icon),
            users!team_invites_from_uid_fkey(pseudo, profilePic)
          `)
          .eq('to_uid', user.id)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        if (error) throw error;
        sendResponse({ success: true, invites: data || [] });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'leaveTeam': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const { data, error } = await supabaseClient.rpc('leave_team');
        if (error) throw error;
        await storageRemove('myTeamId');
        sendResponse(data);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'kickTeamMember': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.targetUid)) return rejectInvalidTargetUid();
        const { data, error } = await supabaseClient.rpc('kick_team_member', {
          p_target_uid: message.targetUid
        });
        if (error) throw error;
        sendResponse(data);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'setTeamMemberRole': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.targetUid)) return rejectInvalidTargetUid();
        if (!['member', 'officer'].includes(message.newRole)) {
          sendResponse({ success: false, error: 'invalid_role' });
          return true;
        }
        const { data, error } = await supabaseClient.rpc('set_team_member_role', {
          p_target_uid: message.targetUid,
          p_new_role: message.newRole
        });
        if (error) throw error;
        sendResponse(data);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'transferTeamOwnership': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.targetUid)) return rejectInvalidTargetUid();
        const { data, error } = await supabaseClient.rpc('transfer_team_ownership', {
          p_to_uid: message.targetUid
        });
        if (error) throw error;
        sendResponse(data);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'getTeamLeaderboard': {
      try {
        const { data, error } = await supabaseClient.rpc('get_team_leaderboard', { p_limit: 20 });

        if (error) {
          console.warn("[VOLT] RPC get_team_leaderboard failed, falling back to manual query:", error);
          const { data: fallbackData, error: fallbackError } = await supabaseClient
            .from('teams')
            .select('id, name, tag, icon, description, wins, member_count:team_members(count)')
            .order('wins', { ascending: false })
            .limit(20);

          if (fallbackError) throw fallbackError;

          const teams = (fallbackData || []).map(t => ({
            team_id: t.id,
            name: t.name,
            tag: t.tag,
            icon: t.icon,
            member_count: t.member_count?.[0]?.count || 0,
            total_score: 0,
            avg_score: 0
          }));
          sendResponse({ success: true, teams });
        } else {
          const fixedData = (data || []).map(t => ({
            ...t,
            id: t.id || t.team_id,
            team_id: t.team_id || t.id,
            icon: t.icon || t.icon_emoji
          }));
          sendResponse({ success: true, teams: fixedData });
        }
      } catch (e) {
        log("❌ Error in getTeamLeaderboard:", e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case 'getTeamChat': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.teamId)) {
          return rejectInvalidTeamId();
        }
        const membership = await assertTeamMembership(message.teamId, user.id);
        if (!membership) { sendResponse({ success: false, error: 'not_team_member' }); return true; }
        const selectors = [
          'id, uid, text, created_at, users(pseudo, profilePic)',
          'id, uid, text, created_at, users(pseudo, profile_pic)',
          'id, uid, text, created_at, users(pseudo)',
          'id, uid, text, created_at'
        ];
        let data = null;
        let lastError = null;
        for (const selector of selectors) {
          const res = await supabaseClient
            .from('team_chat')
            .select(selector)
            .eq('team_id', message.teamId)
            .order('created_at', { ascending: false })
            .limit(50);
          if (!res.error) { data = res.data || []; lastError = null; break; }
          lastError = res.error;
          if (!_voltTeamsLooksLikeSchemaDrift(res.error)) break;
        }
        if (lastError) throw lastError;
        const msgs = (data || []).map(m => ({
          ...m,
          text: _voltTeamChatCleanText(m.text, 500),
          pseudo: m.users?.pseudo || m.pseudo || 'Anonyme',
          profilePic: m.users?.profilePic || m.users?.profile_pic || m.profilePic || m.profile_pic || null
        })).filter(m => m.text).reverse();
        sendResponse({ success: true, messages: msgs });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'sendTeamChatMessage': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.teamId)) {
          return rejectInvalidTeamId();
        }
        const membership = await assertTeamMembership(message.teamId, user.id);
        if (!membership) { sendResponse({ success: false, error: 'not_team_member' }); return true; }
        const text = _voltTeamChatCleanText(message.text, 500);
        if (!text) { sendResponse({ success: false, error: 'empty_message' }); return true; }
        const gate = _voltTeamChatCanSend(user.id, message.teamId);
        if (!gate.ok) { sendResponse({ success: false, error: 'slowmode_active', remainingMs: gate.remainingMs }); return true; }
        const { error } = await supabaseClient.from('team_chat').insert({
          team_id: message.teamId,
          uid: user.id,
          text
        });
        if (error) throw error;
        incrementChallengeByType('team_chat_count');
        sendResponse({ success: true });
      } catch (e) {
        _voltTeamChatReleaseSendGate(user?.id, message?.teamId);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case 'getDailyChallenges': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [challengesRes, progressRes] = await Promise.all([
          supabaseClient.from('daily_challenges')
            .select('id, key, title, description, icon, credits_reward, target_value, type')
            .eq('is_active', true)
            .order('credits_reward', { ascending: true }),
          supabaseClient.from('user_daily_challenges')
            .select('challenge_id, progress, completed, credits_granted')
            .eq('user_id', user.id)
            .eq('day_key', today)
        ]);
        if (challengesRes.error) throw challengesRes.error;
        if (progressRes.error) throw progressRes.error;
        const progressMap = {};
        for (const p of (progressRes.data || [])) {
          progressMap[p.challenge_id] = p;
        }
        const todayChallenges = await getTodayChallenges();

        const enriched = todayChallenges.map(c => ({
          ...c,
          progress: progressMap[c.id]?.progress ?? 0,
          completed: progressMap[c.id]?.completed ?? false,
          credits_granted: progressMap[c.id]?.credits_granted ?? 0
        }));
        sendResponse({ success: true, challenges: enriched });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'updateChallengeProgress': {
      sendResponse({ success: false, error: 'forbidden_client_challenge_update' });
      return true;
    }

    case 'getTeamWar': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const teamId = message.teamId;
        if (!isValidUUID(teamId)) { sendResponse({ success: false, error: 'invalid_team_id' }); return true; }

        const { data, error } = await supabaseClient.rpc('get_team_war', { p_team_id: teamId });
        if (error) throw error;

        // Enrich with opponent team name if war found
        let war = data || null;
        if (war) {
          const opponentId = war.team_a_id === teamId ? war.team_b_id : war.team_a_id;
          const { data: opponentTeam } = await supabaseClient
            .from('teams')
            .select('id, name, tag, icon')
            .eq('id', opponentId)
            .maybeSingle();
          war = { ...war, opponent: opponentTeam || null };
        }

        sendResponse({ success: true, war });
      } catch (e) {
        log('[VOLT] getTeamWar error:', e?.message || e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    case 'getTeamAchievements': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        const teamId = message.teamId;
        if (!isValidUUID(teamId)) { sendResponse({ success: false, error: 'invalid_team_id' }); return true; }

        const [allRes, unlocksRes] = await Promise.all([
          supabaseClient
            .from('team_achievements')
            .select('key, label_fr, label_en, description_fr, condition_type, condition_value, icon')
            .order('condition_value', { ascending: true }),
          supabaseClient
            .from('team_achievement_unlocks')
            .select('achievement_key, unlocked_at')
            .eq('team_id', teamId)
        ]);

        if (allRes.error) throw allRes.error;
        if (unlocksRes.error) throw unlocksRes.error;

        const unlockedMap = {};
        for (const u of (unlocksRes.data || [])) {
          unlockedMap[u.achievement_key] = u.unlocked_at;
        }

        const achievements = (allRes.data || []).map(a => ({
          ...a,
          unlocked: !!unlockedMap[a.key],
          unlocked_at: unlockedMap[a.key] || null
        }));

        sendResponse({ success: true, achievements });
      } catch (e) {
        log('[VOLT] getTeamAchievements error:', e?.message || e);
        sendResponse({ success: false, error: e?.message || String(e) });
      }
      return true;
    }

    // ── BANQUE D'ÉQUIPE ───────────────────────────────────────
    case 'getTeamBank': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.teamId)) return rejectInvalidTeamId();
        const membership = await assertTeamMembership(message.teamId, user.id);
        if (!membership) { sendResponse({ success: false, error: 'not_team_member' }); return true; }

        const [bankRes, txnRes] = await Promise.all([
          supabaseClient
            .from('team_credit_bank')
            .select('balance, updated_at')
            .eq('team_id', message.teamId)
            .maybeSingle(),
          supabaseClient
            .from('team_credit_transactions')
            .select('id, user_id, amount, type, note, created_at, users(pseudo)')
            .eq('team_id', message.teamId)
            .order('created_at', { ascending: false })
            .limit(10)
        ]);

        if (bankRes.error) throw bankRes.error;
        if (txnRes.error) throw txnRes.error;

        const transactions = (txnRes.data || []).map(t => ({
          id: t.id,
          user_id: t.user_id,
          pseudo: t.users?.pseudo || 'Anonyme',
          amount: t.amount,
          type: t.type,
          note: t.note || null,
          created_at: t.created_at
        }));

        sendResponse({
          success: true,
          balance: bankRes.data?.balance ?? 0,
          updated_at: bankRes.data?.updated_at ?? null,
          transactions
        });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'teamDepositCredits': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.teamId)) return rejectInvalidTeamId();
        const amount = clampInteger(message.amount, 1, 10000, 0);
        if (!amount) { sendResponse({ success: false, error: 'invalid_amount' }); return true; }
        const note = message.note ? String(message.note).trim().slice(0, 200) : null;
        const { data, error } = await supabaseClient.rpc('team_deposit_credits', {
          p_team_id: message.teamId,
          p_amount: amount,
          p_note: note || null
        });
        if (error) throw error;
        sendResponse(data);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    case 'teamWithdrawCredits': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      try {
        if (!isValidUUID(message.teamId)) return rejectInvalidTeamId();
        if (!isValidUUID(message.targetUid)) return rejectInvalidTargetUid();
        const amount = clampInteger(message.amount, 1, 1000000, 0);
        if (!amount) { sendResponse({ success: false, error: 'invalid_amount' }); return true; }
        const { data, error } = await supabaseClient.rpc('team_withdraw_credits', {
          p_team_id: message.teamId,
          p_user_target: message.targetUid,
          p_amount: amount
        });
        if (error) throw error;
        sendResponse(data);
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    // ============================================================
    //  Challenges d'équipe quotidiens (Wave 5)
    // ============================================================

    case 'getTeamDailyChallenges': {
      const user = await waitForAuthUser();
      if (!user) { sendResponse({ success: false, error: 'not_logged_in' }); return true; }
      if (!isValidUUID(message.teamId)) return rejectInvalidTeamId();
      try {
        const { data, error } = await supabaseClient.rpc('get_team_daily_challenges', {
          p_team_id: message.teamId
        });
        if (error) throw error;
        sendResponse({ success: true, challenges: data || [] });
      } catch (e) { sendResponse({ success: false, error: e?.message || String(e) }); }
      return true;
    }

    default:
      return false;
  }
}
