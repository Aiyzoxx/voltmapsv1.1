--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: abandon_duel(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.abandon_duel(p_match_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match public.duel_matches%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_my_side VARCHAR(20);
  v_winner UUID;
  v_winner_side VARCHAR(20);
  v_has_started BOOLEAN := FALSE;
  v_existing_state public.duel_run_states%ROWTYPE;
  v_elapsed INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'abandoned', false, 'error', 'not_authenticated'); END IF;
  IF public.is_banned() THEN RETURN jsonb_build_object('success', false, 'abandoned', false, 'error', 'banned'); END IF;

  PERFORM public.expire_old_duels();

  SELECT * INTO v_match
  FROM public.duel_matches
  WHERE status IN ('pending', 'active')
    AND (challenger_uid = v_user_id OR opponent_uid = v_user_id)
    AND (p_match_id IS NULL OR id = p_match_id)
  ORDER BY COALESCE(started_at, accepted_at, created_at) DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'abandoned', false, 'error', 'duel_not_active');
  END IF;

  v_my_side := CASE WHEN v_match.challenger_uid = v_user_id THEN 'challenger' ELSE 'opponent' END;

  IF v_match.status = 'pending' THEN
    PERFORM public.refund_duel_escrow(v_match.id);
    UPDATE public.duel_matches
    SET status = 'cancelled',
        completed_at = v_now,
        abandoned_by = v_user_id,
        abandoned_at = v_now,
        cancel_reason = 'abandoned_before_accept',
        finish_reason = 'cancelled_before_start'
    WHERE id = v_match.id AND status = 'pending';

    RETURN jsonb_build_object(
      'success', true,
      'abandoned', true,
      'cancelled', true,
      'status', 'cancelled',
      'match_id', v_match.id,
      'abandoned_by', v_user_id,
      'abandoned_side', v_my_side,
      'finish_reason', 'cancelled_before_start'
    );
  END IF;

  SELECT * INTO v_existing_state
  FROM public.duel_run_states
  WHERE match_id = v_match.id AND user_id = v_user_id
  FOR UPDATE;

  IF FOUND THEN
    v_elapsed := LEAST(43200000, GREATEST(0, COALESCE(v_existing_state.elapsed_ms, 0), FLOOR(EXTRACT(EPOCH FROM (v_now - COALESCE(v_existing_state.run_started_at, v_now))) * 1000)::INTEGER));
  ELSE
    v_elapsed := 0;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.duel_run_states s
    WHERE s.match_id = v_match.id
      AND s.state IN ('running', 'finished')
      AND s.run_started_at IS NOT NULL
  ) OR EXISTS(
    SELECT 1 FROM public.duel_match_results r
    WHERE r.match_id = v_match.id
  ) OR COALESCE(v_match.is_bot_match, FALSE)
  INTO v_has_started;

  IF NOT v_has_started THEN
    PERFORM public.refund_duel_escrow(v_match.id);
    UPDATE public.duel_matches
    SET status = 'cancelled',
        completed_at = v_now,
        abandoned_by = v_user_id,
        abandoned_at = v_now,
        cancel_reason = 'abandoned_before_run',
        finish_reason = 'cancelled_before_run'
    WHERE id = v_match.id AND status = 'active';

    INSERT INTO public.duel_run_states(match_id, user_id, state, elapsed_ms, run_started_at, last_seen_at, updated_at)
    VALUES (v_match.id, v_user_id, 'finished', 0, NULL, v_now, v_now)
    ON CONFLICT (match_id, user_id) DO UPDATE
      SET state = 'finished', last_seen_at = v_now, updated_at = v_now;

    RETURN jsonb_build_object(
      'success', true,
      'abandoned', true,
      'cancelled', true,
      'status', 'cancelled',
      'match_id', v_match.id,
      'abandoned_by', v_user_id,
      'abandoned_side', v_my_side,
      'finish_reason', 'cancelled_before_run'
    );
  END IF;

  IF v_my_side = 'challenger' THEN
    v_winner := CASE WHEN COALESCE(v_match.is_bot_match, FALSE) THEN NULL ELSE v_match.opponent_uid END;
    v_winner_side := 'opponent';
  ELSE
    v_winner := v_match.challenger_uid;
    v_winner_side := 'challenger';
  END IF;

  INSERT INTO public.duel_run_states(match_id, user_id, state, elapsed_ms, run_started_at, last_seen_at, updated_at)
  VALUES (v_match.id, v_user_id, 'finished', v_elapsed, COALESCE(v_existing_state.run_started_at, v_match.started_at, v_now), v_now, v_now)
  ON CONFLICT (match_id, user_id) DO UPDATE
    SET state = 'finished',
        elapsed_ms = GREATEST(public.duel_run_states.elapsed_ms, EXCLUDED.elapsed_ms),
        run_started_at = COALESCE(public.duel_run_states.run_started_at, EXCLUDED.run_started_at),
        last_seen_at = EXCLUDED.last_seen_at,
        updated_at = EXCLUDED.updated_at;

  PERFORM public.finish_duel_payout(v_match.id, v_winner);

  UPDATE public.duel_matches
  SET status = 'completed',
      winner_uid = v_winner,
      winner_side = v_winner_side,
      completed_at = v_now,
      abandoned_by = v_user_id,
      abandoned_at = v_now,
      finish_reason = 'abandoned'
  WHERE id = v_match.id AND status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'abandoned', true,
    'cancelled', false,
    'status', 'completed',
    'match_id', v_match.id,
    'abandoned_by', v_user_id,
    'abandoned_side', v_my_side,
    'winner_uid', v_winner,
    'winner_side', v_winner_side,
    'is_bot_match', COALESCE(v_match.is_bot_match, FALSE),
    'finish_reason', 'abandoned'
  );
END;
$$;


--
-- Name: accept_friend_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_friend_request(request_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  req RECORD;
  my_pseudo TEXT;
BEGIN
  -- 1. Récupérer la requête
  SELECT * INTO req FROM public.friend_requests WHERE id = request_id AND receiver_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Requête non trouvée ou déjà traitée.';
  END IF;

  -- 2. Récupérer mon pseudo
  SELECT pseudo INTO my_pseudo FROM public.users WHERE id = auth.uid();

  -- 3. Insérer les deux côtés de l'amitié (ON CONFLICT ignore si déjà fait)
  INSERT INTO public.friends (user_id, friend_id, friend_pseudo)
  VALUES (auth.uid(), req.from_uid, req.from_pseudo)
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  INSERT INTO public.friends (user_id, friend_id, friend_pseudo)
  VALUES (req.from_uid, auth.uid(), my_pseudo)
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  -- 4. Supprimer la requête
  DELETE FROM public.friend_requests WHERE id = request_id;
END;
$$;


--
-- Name: accept_team_invite(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_team_invite(p_invite_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team_id UUID;
  v_cur_cnt INTEGER;
  v_max     INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF public.is_banned() THEN RAISE EXCEPTION 'account_banned'; END IF;

  SELECT team_id INTO v_team_id
  FROM public.team_invites
  WHERE id = p_invite_id AND to_uid = v_user_id
    AND status = 'pending' AND expires_at > NOW();

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invite_not_found_or_expired');
  END IF;

  IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_in_team');
  END IF;

  SELECT COUNT(tm.user_id), t.max_members
  INTO v_cur_cnt, v_max
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.team_id = v_team_id
  GROUP BY t.max_members;

  IF v_cur_cnt >= v_max THEN
    RETURN jsonb_build_object('success', false, 'error', 'team_full');
  END IF;

  UPDATE public.team_invites SET status = 'accepted' WHERE id = p_invite_id;

  INSERT INTO public.team_members(team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'member');

  RETURN jsonb_build_object('success', true, 'team_id', v_team_id);
END;
$$;


--
-- Name: add_user_xp(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_user_xp(p_user_id uuid, p_xp integer) RETURNS TABLE(new_xp integer, new_level integer, leveled_up boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_xp INTEGER;
  v_old_level INTEGER;
  v_new_level INTEGER;
BEGIN
  UPDATE users SET xp = GREATEST(0, xp + p_xp)
  WHERE id = p_user_id
  RETURNING xp, level_cached INTO v_xp, v_old_level;

  -- Formule level : level = floor(sqrt(xp / 100)) + 1, cap 100
  v_new_level := LEAST(100, FLOOR(SQRT(v_xp::FLOAT / 100.0))::INTEGER + 1);

  IF v_new_level != v_old_level THEN
    UPDATE users SET level_cached = v_new_level WHERE id = p_user_id;
  END IF;

  RETURN QUERY SELECT v_xp, v_new_level, (v_new_level > v_old_level);
END;
$$;


--
-- Name: admin_add_run(uuid, numeric, text, timestamp with time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_add_run(p_target_uid uuid, p_duration numeric, p_category text DEFAULT 'no_coin'::text, p_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_duration NUMERIC := p_duration;
  v_category TEXT := lower(trim(COALESCE(p_category, 'no_coin')));
  v_run_id UUID;
  v_score_id UUID;
BEGIN
  v_admin := public.admin_assert_permission('manage_runs');
  IF p_target_uid IS NULL THEN RAISE EXCEPTION 'target_user_required'; END IF;
  IF v_duration IS NULL OR v_duration <= 0 OR v_duration > 43200 THEN RAISE EXCEPTION 'invalid_run_duration'; END IF;
  IF v_category NOT IN ('speedrun','no_coin','no_coin_record','no_coin_average') AND v_category NOT LIKE 'no_coin_weekly_%' THEN RAISE EXCEPTION 'invalid_category'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_target_uid) THEN RAISE EXCEPTION 'target_user_not_found'; END IF;

  INSERT INTO public.run_history(user_id, duration, created_at, status, source, added_by_admin, admin_note)
  VALUES (p_target_uid, v_duration, COALESCE(p_created_at, NOW()), 'valid', 'admin_added', v_admin, v_reason)
  RETURNING id INTO v_run_id;

  INSERT INTO public.scores(user_id, category, time, created_at, status, source, added_by_admin, admin_note)
  VALUES (p_target_uid, v_category, v_duration, COALESCE(p_created_at, NOW()), 'valid', 'admin_added', v_admin, v_reason)
  RETURNING id INTO v_score_id;

  PERFORM public.admin_log_action(v_admin, p_target_uid, 'run', v_run_id::TEXT, 'add_run', v_reason, NULL,
    jsonb_build_object('run_history_id', v_run_id, 'score_id', v_score_id, 'duration', v_duration, 'category', v_category), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'run_history_id', v_run_id, 'score_id', v_score_id);
END;
$$;


--
-- Name: admin_assert_permission(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_assert_permission(p_permission text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID := auth.uid();
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.has_admin_permission(p_permission) THEN
    RAISE EXCEPTION 'not_admin_or_missing_permission:%', p_permission;
  END IF;
  RETURN v_admin;
END;
$$;


--
-- Name: admin_assign_tournament_badge(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_assign_tournament_badge(p_user_id uuid, p_badge text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  UPDATE public.users
    SET cosmetic_badges = array_append(COALESCE(cosmetic_badges, '{}'), p_badge)
    WHERE id = p_user_id;
  PERFORM public.log_admin_action(
    'assign_badge',
    p_user_id,
    jsonb_build_object('badge', p_badge)
  );
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: admin_ban_user(uuid, text, text, timestamp with time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_ban_user(p_target_uid uuid, p_ban_type text DEFAULT 'global'::text, p_reason text DEFAULT NULL::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_admin_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_type TEXT := lower(trim(COALESCE(p_ban_type, 'global')));
  v_old JSONB;
  v_ban_id UUID;
BEGIN
  v_admin := public.admin_assert_permission('manage_bans');
  IF p_target_uid IS NULL THEN RAISE EXCEPTION 'target_user_required'; END IF;
  IF v_type NOT IN ('global','chat','leaderboard','runs','duels','clans') THEN RAISE EXCEPTION 'invalid_ban_type'; END IF;
  IF p_target_uid = v_admin AND v_type = 'global' THEN RAISE EXCEPTION 'cannot_global_ban_self'; END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= NOW() THEN RAISE EXCEPTION 'invalid_ban_expiry'; END IF;

  SELECT to_jsonb(u) INTO v_old FROM public.users u WHERE u.id = p_target_uid FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'target_user_not_found'; END IF;

  INSERT INTO public.user_bans(user_id, ban_type, reason, admin_note, expires_at, created_by)
  VALUES (p_target_uid, v_type, v_reason, p_admin_note, p_expires_at, v_admin)
  RETURNING id INTO v_ban_id;

  IF v_type = 'global' THEN
    UPDATE public.users
    SET is_banned = TRUE,
        settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{ban_reason}', to_jsonb(v_reason), TRUE),
        updated_at = NOW()
    WHERE id = p_target_uid;
  END IF;

  PERFORM public.admin_log_action(v_admin, p_target_uid, 'user', p_target_uid::TEXT, 'ban_' || v_type, v_reason, v_old,
    jsonb_build_object('ban_id', v_ban_id, 'ban_type', v_type, 'expires_at', p_expires_at, 'admin_note', p_admin_note), '{}'::jsonb);
  INSERT INTO public.moderation_actions(admin_id, target_user_id, target_type, target_id, action, reason, metadata)
  VALUES (v_admin, p_target_uid, 'user', p_target_uid::TEXT, 'ban_' || v_type, v_reason, jsonb_build_object('ban_id', v_ban_id, 'expires_at', p_expires_at));

  RETURN jsonb_build_object('success', true, 'ban_id', v_ban_id, 'user_id', p_target_uid, 'ban_type', v_type);
END;
$$;


--
-- Name: admin_ban_user_nuclear(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_ban_user_nuclear(p_target_uid uuid, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_target RECORD;
  v_reason TEXT := NULLIF(BTRIM(p_reason), '');
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Admin gate matching admin_get_me: admin_roles first, users.role fallback.
  SELECT TRUE INTO v_is_admin
    FROM public.admin_roles
   WHERE user_id = v_caller AND is_active = TRUE
   LIMIT 1;
  IF NOT FOUND THEN
    SELECT (role IN ('owner','admin','super_admin')) INTO v_is_admin
      FROM public.users WHERE id = v_caller;
  END IF;
  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Lock the target row, fetch hwid + pseudo for blacklist/log.
  SELECT id, pseudo, hwid INTO v_target
    FROM public.users
   WHERE id = p_target_uid
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_not_found');
  END IF;

  -- 1. Mark account banned.
  UPDATE public.users SET is_banned = TRUE WHERE id = p_target_uid;

  -- 2. Blacklist HWID (only when present — legacy users may have NULL hwid).
  IF v_target.hwid IS NOT NULL AND v_target.hwid <> '' THEN
    INSERT INTO public.blacklist(identifier, reason)
      VALUES (
        v_target.hwid,
        format('Account: %s (ID:%s) - %s',
               COALESCE(v_target.pseudo, '<no pseudo>'),
               v_target.id,
               COALESCE(v_reason, 'Banned by administrator.'))
      )
      ON CONFLICT (identifier) DO UPDATE
        SET reason = EXCLUDED.reason;
  END IF;

  -- 3. Audit log.
  INSERT INTO public.moderation_log(admin_id, action_type, target_user_id, details)
    VALUES (
      v_caller,
      'ban_nuclear',
      p_target_uid,
      jsonb_build_object(
        'reason', COALESCE(v_reason, 'Banned by administrator.'),
        'pseudo', v_target.pseudo,
        'hwid_blacklisted', v_target.hwid IS NOT NULL AND v_target.hwid <> ''
      )
    );

  RETURN jsonb_build_object(
    'success', true,
    'target_uid', v_target.id,
    'pseudo', v_target.pseudo,
    'hwid_blacklisted', v_target.hwid IS NOT NULL AND v_target.hwid <> ''
  );
END;
$$;


--
-- Name: admin_bump_suspicion(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_bump_suspicion(p_uid uuid, p_delta integer, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_admin uuid;
BEGIN
  v_admin := admin_assert_permission('manage_runs');
  IF p_uid IS NULL THEN RAISE EXCEPTION 'invalid_target'; END IF;
  IF p_delta IS NULL OR ABS(p_delta) > 100 THEN
    RAISE EXCEPTION 'invalid_delta';
  END IF;
  PERFORM bump_suspicion(p_uid, p_delta, COALESCE(p_reason, 'admin_manual'));
  RETURN jsonb_build_object('success', true);
END $$;


--
-- Name: admin_cancel_duel(uuid, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_cancel_duel(p_match_id uuid, p_reason text, p_refund_tokens boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_old public.duel_matches%ROWTYPE;
BEGIN
  v_admin := public.admin_assert_permission('manage_duels');
  IF p_match_id IS NULL THEN RAISE EXCEPTION 'match_id_required'; END IF;
  SELECT * INTO v_old FROM public.duel_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'duel_not_found'; END IF;

  UPDATE public.duel_matches
  SET status = 'cancelled', completed_at = COALESCE(completed_at, NOW()), cancelled_by = v_admin, winner_uid = NULL,
      admin_note = v_reason, admin_resolution = COALESCE(admin_resolution,'{}'::jsonb) || jsonb_build_object('action','cancelled','reason',v_reason,'refunded',p_refund_tokens)
  WHERE id = p_match_id;
  UPDATE public.duel_match_results SET status = 'admin_voided', invalidated_at = NOW(), invalidated_by = v_admin, invalidation_reason = v_reason WHERE match_id = p_match_id AND COALESCE(status,'valid') = 'valid';

  IF p_refund_tokens AND to_regprocedure('public.refund_duel_escrow(uuid)') IS NOT NULL THEN
    PERFORM public.refund_duel_escrow(p_match_id);
  END IF;

  PERFORM public.admin_log_action(v_admin, NULL, 'duel', p_match_id::TEXT, 'cancel_duel', v_reason, to_jsonb(v_old), jsonb_build_object('status','cancelled','refund_tokens',p_refund_tokens), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'match_id', p_match_id, 'status', 'cancelled');
END;
$$;


--
-- Name: admin_clean_reason(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_clean_reason(p_reason text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  v_reason TEXT := trim(COALESCE(p_reason, ''));
BEGIN
  IF char_length(v_reason) < 3 THEN
    RAISE EXCEPTION 'admin_reason_required';
  END IF;
  IF char_length(v_reason) > 1000 THEN
    v_reason := left(v_reason, 1000);
  END IF;
  RETURN v_reason;
END;
$$;


--
-- Name: admin_close_season(integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_close_season(p_season_id integer, p_reward_top1 integer DEFAULT 100, p_reward_top10 integer DEFAULT 30, p_reward_top100 integer DEFAULT 10) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin uuid;
  v_count int := 0;
  v_rewarded int := 0;
BEGIN
  v_admin := admin_assert_permission('manage_duels');

  IF NOT EXISTS (SELECT 1 FROM elo_seasons WHERE id = p_season_id AND closed_at IS NULL) THEN
    RAISE EXCEPTION 'season_not_found_or_closed';
  END IF;

  -- Snapshot current player_elo as final standings.
  WITH ranked AS (
    SELECT
      pe.user_id,
      pe.duel_elo,
      pe.wins,
      pe.losses,
      pe.draws,
      pe.best_win_streak,
      pe.duels_played,
      ROW_NUMBER() OVER (ORDER BY pe.duel_elo DESC NULLS LAST, pe.wins DESC, pe.duels_played DESC)::int AS rk
    FROM player_elo pe
    WHERE pe.duels_played > 0
  )
  INSERT INTO elo_season_snapshots (
    season_id, user_id, final_elo, final_rank, rank_tier,
    wins, losses, draws, best_streak, duels_played
  )
  SELECT
    p_season_id, r.user_id, COALESCE(r.duel_elo, 1000), r.rk, volt_rank_tier(r.duel_elo),
    r.wins, r.losses, r.draws, r.best_win_streak, r.duels_played
  FROM ranked r
  ON CONFLICT (season_id, user_id) DO UPDATE
    SET final_elo = EXCLUDED.final_elo,
        final_rank = EXCLUDED.final_rank,
        rank_tier = EXCLUDED.rank_tier;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Tiered rewards: top 1, top 10, top 100. Only insert if delta > 0.
  IF p_reward_top1 > 0 THEN
    INSERT INTO elo_season_rewards (season_id, user_id, rank, rank_tier, reward_tokens)
    SELECT p_season_id, user_id, final_rank, rank_tier, p_reward_top1
    FROM elo_season_snapshots
    WHERE season_id = p_season_id AND final_rank = 1;
  END IF;

  IF p_reward_top10 > 0 THEN
    INSERT INTO elo_season_rewards (season_id, user_id, rank, rank_tier, reward_tokens)
    SELECT p_season_id, user_id, final_rank, rank_tier, p_reward_top10
    FROM elo_season_snapshots
    WHERE season_id = p_season_id AND final_rank BETWEEN 2 AND 10;
  END IF;

  IF p_reward_top100 > 0 THEN
    INSERT INTO elo_season_rewards (season_id, user_id, rank, rank_tier, reward_tokens)
    SELECT p_season_id, user_id, final_rank, rank_tier, p_reward_top100
    FROM elo_season_snapshots
    WHERE season_id = p_season_id AND final_rank BETWEEN 11 AND 100;
  END IF;

  -- Grant tokens via existing infrastructure.
  FOR v_rewarded IN
    SELECT 1 FROM elo_season_rewards WHERE season_id = p_season_id
  LOOP
    PERFORM apply_token_delta(
      (SELECT user_id FROM elo_season_rewards WHERE season_id = p_season_id ORDER BY id DESC LIMIT 1),
      0, 'season_reward', 'season ' || p_season_id::text || ' close', NULL
    );
  END LOOP;

  -- Mark season closed.
  UPDATE elo_seasons
     SET is_active = false, closed_at = now()
   WHERE id = p_season_id;

  PERFORM admin_log_action(
    v_admin, NULL, 'season', p_season_id::text,
    'admin_close_season', 'season closed',
    NULL,
    jsonb_build_object('snapshot_count', v_count)
  );

  RETURN jsonb_build_object(
    'success', true,
    'season_id', p_season_id,
    'snapshot_count', v_count
  );
END $$;


--
-- Name: admin_create_tournament(text, text, integer, integer, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_create_tournament(p_name text, p_format text DEFAULT 'single_elim_8'::text, p_entry_tokens integer DEFAULT 0, p_prize_tokens integer DEFAULT 0, p_starts_at timestamp with time zone DEFAULT now()) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin uuid := admin_assert_permission('manage_duels');
  v_id uuid;
  v_max int := 8;
BEGIN
  IF p_name IS NULL OR length(btrim(p_name)) < 3 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF p_format = 'single_elim_16' THEN v_max := 16; END IF;
  INSERT INTO tournaments (name, format, entry_tokens, prize_tokens, starts_at, max_players, created_by)
  VALUES (btrim(p_name), p_format, COALESCE(p_entry_tokens,0), COALESCE(p_prize_tokens,0),
          COALESCE(p_starts_at, now()), v_max, v_admin)
  RETURNING id INTO v_id;
  PERFORM admin_log_action(v_admin, NULL, 'tournament', v_id::text,
    'admin_create_tournament', 'create',
    NULL, jsonb_build_object('name', p_name, 'format', p_format));
  RETURN jsonb_build_object('success', true, 'tournament_id', v_id);
END $$;


--
-- Name: admin_default_permissions(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_default_permissions(p_role text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  CASE lower(COALESCE(p_role, ''))
    WHEN 'owner' THEN
      RETURN ARRAY[
        'manage_admin_roles','manage_users','manage_bans','manage_messages','manage_clans',
        'manage_runs','manage_duels','view_logs','view_sensitive','manage_tokens'
      ];
    WHEN 'admin' THEN
      RETURN ARRAY[
        'manage_users','manage_bans','manage_messages','manage_clans',
        'manage_runs','manage_duels','view_logs','view_sensitive','manage_tokens'
      ];
    WHEN 'moderator' THEN
      RETURN ARRAY['manage_users','manage_bans','manage_messages','manage_clans','manage_runs','manage_duels','view_logs'];
    WHEN 'support' THEN
      RETURN ARRAY['manage_users','manage_messages','manage_clans','view_logs'];
    ELSE
      RETURN ARRAY[]::TEXT[];
  END CASE;
END;
$$;


--
-- Name: admin_delete_clan(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_clan(p_team_id uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_old JSONB;
  v_owner UUID;
BEGIN
  v_admin := public.admin_assert_permission('manage_clans');
  IF p_team_id IS NULL THEN RAISE EXCEPTION 'team_id_required'; END IF;
  SELECT to_jsonb(t) INTO v_old FROM public.teams t WHERE t.id = p_team_id FOR UPDATE;
  SELECT user_id INTO v_owner FROM public.team_members WHERE team_id = p_team_id AND role = 'owner' LIMIT 1;
  IF v_old IS NULL THEN RAISE EXCEPTION 'team_not_found'; END IF;
  UPDATE public.teams SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = v_admin, delete_reason = v_reason, admin_note = v_reason WHERE id = p_team_id;
  PERFORM public.admin_log_action(v_admin, v_owner, 'team', p_team_id::TEXT, 'delete_clan', v_reason, v_old, jsonb_build_object('is_deleted', true), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'team_id', p_team_id);
END;
$$;


--
-- Name: admin_delete_message(text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_message(p_message_table text, p_message_id uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_table TEXT := lower(trim(COALESCE(p_message_table, '')));
  v_old JSONB;
  v_target_user UUID;
BEGIN
  v_admin := public.admin_assert_permission('manage_messages');
  IF p_message_id IS NULL THEN RAISE EXCEPTION 'message_id_required'; END IF;

  IF v_table = 'global_chat' THEN
    SELECT to_jsonb(g), g.uid INTO v_old, v_target_user FROM public.global_chat g WHERE g.id = p_message_id FOR UPDATE;
    IF v_old IS NULL THEN RAISE EXCEPTION 'message_not_found'; END IF;
    UPDATE public.global_chat SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = v_admin, delete_reason = v_reason WHERE id = p_message_id;
  ELSIF v_table = 'direct_messages' THEN
    SELECT to_jsonb(d), d.from_uid INTO v_old, v_target_user FROM public.direct_messages d WHERE d.id = p_message_id FOR UPDATE;
    IF v_old IS NULL THEN RAISE EXCEPTION 'message_not_found'; END IF;
    UPDATE public.direct_messages SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = v_admin, delete_reason = v_reason WHERE id = p_message_id;
  ELSIF v_table = 'team_chat' THEN
    SELECT to_jsonb(t), t.uid INTO v_old, v_target_user FROM public.team_chat t WHERE t.id = p_message_id FOR UPDATE;
    IF v_old IS NULL THEN RAISE EXCEPTION 'message_not_found'; END IF;
    UPDATE public.team_chat SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = v_admin, delete_reason = v_reason WHERE id = p_message_id;
  ELSE
    RAISE EXCEPTION 'invalid_message_table';
  END IF;

  PERFORM public.admin_log_action(v_admin, v_target_user, v_table, p_message_id::TEXT, 'delete_message', v_reason, v_old,
    jsonb_build_object('is_deleted', true), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'message_table', v_table, 'message_id', p_message_id);
END;
$$;


--
-- Name: admin_get_audit_logs(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_audit_logs(p_query text DEFAULT ''::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_limit INTEGER := LEAST(100, GREATEST(1, COALESCE(p_limit, 50)));
  v_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
  v_q TEXT := '%' || lower(trim(COALESCE(p_query, ''))) || '%';
  v_items JSONB;
BEGIN
  v_admin := public.admin_assert_permission('view_logs');

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT l.*, au.pseudo AS admin_pseudo, tu.pseudo AS target_pseudo
    FROM public.admin_audit_logs l
    LEFT JOIN public.users au ON au.id = l.admin_id
    LEFT JOIN public.users tu ON tu.id = l.target_user_id
    WHERE trim(COALESCE(p_query,'')) = ''
       OR lower(COALESCE(l.action,'')) LIKE v_q
       OR lower(COALESCE(l.target_type,'')) LIKE v_q
       OR lower(COALESCE(l.reason,'')) LIKE v_q
       OR lower(COALESCE(au.pseudo,'')) LIKE v_q
       OR lower(COALESCE(tu.pseudo,'')) LIKE v_q
       OR COALESCE(l.target_id,'') ILIKE '%' || trim(COALESCE(p_query,'')) || '%'
    ORDER BY l.created_at DESC
    LIMIT v_limit OFFSET v_offset
  ) x;

  RETURN jsonb_build_object('success', true, 'logs', v_items, 'limit', v_limit, 'offset', v_offset);
END;
$$;


--
-- Name: admin_get_dashboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_dashboard() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_recent_actions JSONB;
BEGIN
  v_admin := public.admin_assert_permission('view_logs');

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_recent_actions
  FROM (
    SELECT id, admin_id, target_type, target_id, action, reason, created_at
    FROM public.admin_audit_logs
    ORDER BY created_at DESC
    LIMIT 8
  ) x;

  RETURN jsonb_build_object(
    'success', true,
    'users_total', (SELECT COUNT(*) FROM public.users),
    'users_banned', (SELECT COUNT(*) FROM public.users WHERE is_banned = TRUE) + (SELECT COUNT(DISTINCT user_id) FROM public.user_bans WHERE is_active = TRUE AND lifted_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())),
    'messages_recent', (SELECT COUNT(*) FROM public.global_chat WHERE created_at > NOW() - INTERVAL '24 hours' AND COALESCE(is_deleted,FALSE)=FALSE),
    'clans_active', (SELECT COUNT(*) FROM public.teams WHERE COALESCE(is_deleted,FALSE)=FALSE),
    'runs_recent', (SELECT COUNT(*) FROM public.run_history WHERE created_at > NOW() - INTERVAL '24 hours' AND COALESCE(status,'valid')='valid'),
    'runs_suspicious', (SELECT COUNT(*) FROM public.run_history WHERE duration <= 0 OR duration > 43200 OR COALESCE(status,'valid') <> 'valid'),
    'duels_open', (SELECT COUNT(*) FROM public.duel_matches WHERE status IN ('pending','active')),
    'duels_stuck', (SELECT COUNT(*) FROM public.duel_matches WHERE status = 'active' AND COALESCE(ends_at, created_at + INTERVAL '15 minutes') < NOW()),
    'actions_recent', v_recent_actions,
    'generated_at', NOW()
  );
END;
$$;


--
-- Name: admin_get_dashboard_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_dashboard_stats() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT json_build_object(
    'dau',               (SELECT COUNT(DISTINCT user_id) FROM run_history WHERE created_at >= CURRENT_DATE),
    'mau',               (SELECT COUNT(DISTINCT user_id) FROM run_history WHERE created_at >= date_trunc('month', NOW())),
    'total_users',       (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL),
    'active_bans',       (SELECT COUNT(*) FROM user_bans WHERE expires_at IS NULL OR expires_at > NOW()),
    'runs_today',        (SELECT COUNT(*) FROM run_history WHERE created_at >= CURRENT_DATE),
    'runs_week',         (SELECT COUNT(*) FROM run_history WHERE created_at >= NOW() - INTERVAL '7 days'),
    'messages_today',    (SELECT COUNT(*) FROM global_chat WHERE created_at >= CURRENT_DATE),
    'messages_week',     (SELECT COUNT(*) FROM global_chat WHERE created_at >= NOW() - INTERVAL '7 days'),
    'new_users_today',   (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE),
    'new_users_week',    (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days'),
    'duel_matches_today',(SELECT COUNT(*) FROM duel_matches WHERE created_at >= CURRENT_DATE),
    'pending_appeals',   (SELECT COUNT(*) FROM ban_appeals WHERE status = 'pending'),
    'runs_per_hour',     (
      SELECT json_agg(json_build_object('hour', hour_bucket, 'count', cnt) ORDER BY hour_bucket)
      FROM (
        SELECT date_trunc('hour', created_at) AS hour_bucket, COUNT(*) AS cnt
        FROM run_history WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY hour_bucket
      ) h
    )
  );
$$;


--
-- Name: admin_get_me(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_me() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role public.admin_roles%ROWTYPE;
  v_legacy_role TEXT;
  v_has_admin_role BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated', 'is_admin', false);
  END IF;

  SELECT * INTO v_role FROM public.admin_roles WHERE user_id = v_user_id AND is_active = TRUE;
  v_has_admin_role := FOUND;
  SELECT role INTO v_legacy_role FROM public.users WHERE id = v_user_id;

  IF v_has_admin_role THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_admin', true,
      'user_id', v_user_id,
      'role', v_role.role,
      'permissions', COALESCE(NULLIF(v_role.permissions, ARRAY[]::TEXT[]), public.admin_default_permissions(v_role.role))
    );
  END IF;

  IF COALESCE(v_legacy_role, '') IN ('owner','admin','super_admin') THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_admin', true,
      'user_id', v_user_id,
      'role', CASE WHEN v_legacy_role = 'super_admin' THEN 'owner' ELSE v_legacy_role END,
      'permissions', public.admin_default_permissions(CASE WHEN v_legacy_role = 'super_admin' THEN 'owner' ELSE v_legacy_role END)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'is_admin', false, 'user_id', v_user_id, 'role', 'user', 'permissions', ARRAY[]::TEXT[]);
END;
$$;


--
-- Name: admin_get_moderation_log(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_moderation_log(p_limit integer DEFAULT 100) RETURNS TABLE(id uuid, admin_username text, action_type text, target_username text, details jsonb, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  RETURN QUERY
    SELECT
      ml.id,
      ua.username,
      ml.action_type,
      ut.username,
      ml.details,
      ml.created_at
    FROM public.moderation_log ml
    LEFT JOIN public.users ua ON ua.id = ml.admin_id
    LEFT JOIN public.users ut ON ut.id = ml.target_user_id
    ORDER BY ml.created_at DESC
    LIMIT p_limit;
END;
$$;


--
-- Name: admin_get_pending_appeals(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_pending_appeals(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  RETURN (
    SELECT COALESCE(json_agg(a ORDER BY a.created_at ASC), '[]'::json)
    FROM (
      SELECT
        ba.id, ba.user_id, ba.ban_id, ba.reason, ba.status, ba.created_at,
        u.pseudo AS user_pseudo,
        ub.ban_type, ub.reason AS ban_reason,
        ub.created_at AS ban_created_at, ub.expires_at AS ban_expires_at
      FROM ban_appeals ba
      JOIN users u ON u.id = ba.user_id
      LEFT JOIN user_bans ub ON ub.id = ba.ban_id
      WHERE ba.status = 'pending'
      ORDER BY ba.created_at ASC
      LIMIT p_limit OFFSET p_offset
    ) a
  );
END;
$$;


--
-- Name: admin_get_suspicious_runs(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_suspicious_runs(p_limit integer DEFAULT 50) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT json_agg(r)
  FROM (
    SELECT rh.id, rh.user_id, u.pseudo, rh.duration, rh.created_at, rh.status,
           CASE WHEN rh.duration < 3 THEN 'too_fast'
                WHEN rh.duration > 600 THEN 'too_slow'
                ELSE 'anomaly' END AS suspect_reason
    FROM run_history rh
    JOIN users u ON u.id = rh.user_id
    WHERE rh.status = 'valid'
      AND rh.admin_note IS NULL
      AND rh.duration < 3
    ORDER BY rh.created_at DESC
    LIMIT p_limit
  ) r;
$$;


--
-- Name: admin_grant_tokens(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_grant_tokens(p_target_uid uuid, p_amount integer, p_description text DEFAULT 'Grant admin token'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Compatible SQL Editor / service_role: public.is_admin() autorise postgres,
  -- supabase_admin, service_role JWT, ou un user role='admin'.
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;
  IF p_target_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_not_found');
  END IF;
  IF COALESCE(p_amount, 0) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  PERFORM public.apply_token_delta(
    p_target_uid,
    p_amount,
    CASE WHEN p_amount > 0 THEN 'admin_grant' ELSE 'admin_revoke' END,
    COALESCE(NULLIF(trim(p_description), ''), CASE WHEN p_amount > 0 THEN 'Admin grant token' ELSE 'Admin revoke token' END),
    NULL
  );

  RETURN jsonb_build_object('success', true, 'user_id', p_target_uid, 'amount', p_amount);
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'insufficient_tokens' THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_tokens');
  END IF;
  RAISE;
END;
$$;


--
-- Name: admin_grant_tokens_by_pseudo(character varying, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_grant_tokens_by_pseudo(p_target_pseudo character varying, p_amount integer, p_description text DEFAULT 'Grant admin token'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_target_uid UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;

  SELECT id INTO v_target_uid
  FROM public.users
  WHERE lower(COALESCE(pseudo, '')) = lower(trim(COALESCE(p_target_pseudo, '')))
     OR lower(COALESCE(username, '')) = lower(trim(COALESCE(p_target_pseudo, '')))
  LIMIT 1;

  IF v_target_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_not_found');
  END IF;

  RETURN public.admin_grant_tokens(v_target_uid, p_amount, p_description);
END;
$$;


--
-- Name: admin_invalidate_run(text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_invalidate_run(p_run_table text, p_run_id uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_table TEXT := lower(trim(COALESCE(p_run_table, '')));
  v_old JSONB;
  v_target UUID;
  v_duel UUID;
BEGIN
  v_admin := public.admin_assert_permission('manage_runs');
  IF p_run_id IS NULL THEN RAISE EXCEPTION 'run_id_required'; END IF;

  IF v_table = 'run_history' THEN
    SELECT to_jsonb(r), r.user_id INTO v_old, v_target FROM public.run_history r WHERE r.id = p_run_id FOR UPDATE;
    UPDATE public.run_history SET status = 'invalid', invalidated_at = NOW(), invalidated_by = v_admin, invalidation_reason = v_reason WHERE id = p_run_id;
  ELSIF v_table = 'scores' THEN
    SELECT to_jsonb(s), s.user_id INTO v_old, v_target FROM public.scores s WHERE s.id = p_run_id FOR UPDATE;
    UPDATE public.scores SET status = 'invalid', invalidated_at = NOW(), invalidated_by = v_admin, invalidation_reason = v_reason WHERE id = p_run_id;
  ELSIF v_table = 'duel_match_results' THEN
    SELECT to_jsonb(d), d.user_id, d.match_id INTO v_old, v_target, v_duel FROM public.duel_match_results d WHERE d.id = p_run_id FOR UPDATE;
    UPDATE public.duel_match_results SET status = 'invalid', invalidated_at = NOW(), invalidated_by = v_admin, invalidation_reason = v_reason WHERE id = p_run_id;
    IF v_duel IS NOT NULL THEN
      UPDATE public.duel_matches SET status = 'voided', completed_at = COALESCE(completed_at, NOW()), voided_at = NOW(), voided_by = v_admin, winner_uid = NULL,
        admin_resolution = COALESCE(admin_resolution, '{}'::jsonb) || jsonb_build_object('reason', v_reason, 'invalidated_result_id', p_run_id)
      WHERE id = v_duel AND status IN ('pending','active','completed');
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid_run_table';
  END IF;
  IF v_old IS NULL THEN RAISE EXCEPTION 'run_not_found'; END IF;

  PERFORM public.admin_log_action(v_admin, v_target, v_table, p_run_id::TEXT, 'invalidate_run', v_reason, v_old, jsonb_build_object('status', 'invalid', 'duel_id', v_duel), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'run_table', v_table, 'run_id', p_run_id, 'duel_id', v_duel);
END;
$$;


--
-- Name: admin_log_action(uuid, uuid, text, text, text, text, jsonb, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_log_action(p_admin_id uuid, p_target_user_id uuid, p_target_type text, p_target_id text, p_action text, p_reason text, p_old_value jsonb DEFAULT NULL::jsonb, p_new_value jsonb DEFAULT NULL::jsonb, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  -- Caller integrity: must equal p_admin_id, OR have audit-log permission, OR be service_role.
  IF v_caller IS NULL
     AND NOT (current_setting('request.jwt.claims', true) ILIKE '%service_role%') THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  IF v_caller IS NOT NULL
     AND p_admin_id IS NOT NULL
     AND p_admin_id <> v_caller
     AND NOT has_admin_permission('view_audit_logs') THEN
    RAISE EXCEPTION 'unauthorized_log_action' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO admin_audit_logs (
    admin_id, target_user_id, target_type, target_id,
    action, reason, old_value, new_value, metadata, created_at
  ) VALUES (
    COALESCE(p_admin_id, v_caller),
    p_target_user_id, p_target_type, p_target_id,
    p_action, p_reason, p_old_value, p_new_value,
    COALESCE(p_metadata, '{}'::jsonb), now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;


--
-- Name: admin_open_season(text, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_open_season(p_name text, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin uuid;
  v_id integer;
BEGIN
  v_admin := admin_assert_permission('manage_duels');
  IF p_name IS NULL OR length(btrim(p_name)) < 3 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'invalid_window';
  END IF;

  -- Deactivate concurrent active seasons.
  UPDATE elo_seasons SET is_active = false
   WHERE is_active = true AND closed_at IS NULL;

  INSERT INTO elo_seasons (name, starts_at, ends_at, is_active)
  VALUES (btrim(p_name), p_starts_at, p_ends_at, true)
  RETURNING id INTO v_id;

  PERFORM admin_log_action(
    v_admin, NULL, 'season', v_id::text,
    'admin_open_season', 'season opened',
    NULL,
    jsonb_build_object('name', p_name, 'starts_at', p_starts_at, 'ends_at', p_ends_at)
  );

  RETURN jsonb_build_object('success', true, 'season_id', v_id);
END $$;


--
-- Name: admin_resolve_duel(uuid, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_resolve_duel(p_match_id uuid, p_resolution text DEFAULT 'voided'::text, p_winner_uid uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_resolution TEXT := lower(trim(COALESCE(p_resolution, 'voided')));
  v_old public.duel_matches%ROWTYPE;
BEGIN
  v_admin := public.admin_assert_permission('manage_duels');
  IF p_match_id IS NULL THEN RAISE EXCEPTION 'match_id_required'; END IF;
  IF v_resolution NOT IN ('cancelled','voided','completed') THEN RAISE EXCEPTION 'invalid_duel_resolution'; END IF;
  SELECT * INTO v_old FROM public.duel_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'duel_not_found'; END IF;
  IF v_resolution = 'completed' AND (p_winner_uid IS NULL OR p_winner_uid NOT IN (v_old.challenger_uid, v_old.opponent_uid)) THEN
    RAISE EXCEPTION 'winner_must_be_duel_player';
  END IF;

  UPDATE public.duel_matches
  SET status = v_resolution,
      completed_at = COALESCE(completed_at, NOW()),
      winner_uid = CASE WHEN v_resolution = 'completed' THEN p_winner_uid ELSE NULL END,
      voided_at = CASE WHEN v_resolution = 'voided' THEN NOW() ELSE voided_at END,
      voided_by = CASE WHEN v_resolution = 'voided' THEN v_admin ELSE voided_by END,
      cancelled_by = CASE WHEN v_resolution = 'cancelled' THEN v_admin ELSE cancelled_by END,
      admin_note = v_reason,
      admin_resolution = COALESCE(admin_resolution,'{}'::jsonb) || jsonb_build_object('action',v_resolution,'reason',v_reason,'winner_uid',p_winner_uid)
  WHERE id = p_match_id;

  IF v_resolution IN ('cancelled','voided') THEN
    UPDATE public.duel_match_results SET status = 'admin_voided', invalidated_at = NOW(), invalidated_by = v_admin, invalidation_reason = v_reason WHERE match_id = p_match_id AND COALESCE(status,'valid') = 'valid';
  END IF;

  PERFORM public.admin_log_action(v_admin, p_winner_uid, 'duel', p_match_id::TEXT, 'resolve_duel', v_reason, to_jsonb(v_old), jsonb_build_object('status',v_resolution,'winner_uid',p_winner_uid), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'match_id', p_match_id, 'status', v_resolution, 'winner_uid', p_winner_uid);
END;
$$;


--
-- Name: admin_restore_clan(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_restore_clan(p_team_id uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_old JSONB;
  v_owner UUID;
BEGIN
  v_admin := public.admin_assert_permission('manage_clans');
  IF p_team_id IS NULL THEN RAISE EXCEPTION 'team_id_required'; END IF;
  SELECT to_jsonb(t) INTO v_old FROM public.teams t WHERE t.id = p_team_id FOR UPDATE;
  SELECT user_id INTO v_owner FROM public.team_members WHERE team_id = p_team_id AND role = 'owner' LIMIT 1;
  IF v_old IS NULL THEN RAISE EXCEPTION 'team_not_found'; END IF;
  UPDATE public.teams SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL, delete_reason = NULL, admin_note = v_reason WHERE id = p_team_id;
  PERFORM public.admin_log_action(v_admin, v_owner, 'team', p_team_id::TEXT, 'restore_clan', v_reason, v_old, jsonb_build_object('is_deleted', false), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'team_id', p_team_id);
END;
$$;


--
-- Name: admin_restore_message(text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_restore_message(p_message_table text, p_message_id uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_table TEXT := lower(trim(COALESCE(p_message_table, '')));
  v_old JSONB;
  v_target_user UUID;
BEGIN
  v_admin := public.admin_assert_permission('manage_messages');
  IF p_message_id IS NULL THEN RAISE EXCEPTION 'message_id_required'; END IF;

  IF v_table = 'global_chat' THEN
    SELECT to_jsonb(g), g.uid INTO v_old, v_target_user FROM public.global_chat g WHERE g.id = p_message_id FOR UPDATE;
    UPDATE public.global_chat SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL, delete_reason = NULL WHERE id = p_message_id;
  ELSIF v_table = 'direct_messages' THEN
    SELECT to_jsonb(d), d.from_uid INTO v_old, v_target_user FROM public.direct_messages d WHERE d.id = p_message_id FOR UPDATE;
    UPDATE public.direct_messages SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL, delete_reason = NULL WHERE id = p_message_id;
  ELSIF v_table = 'team_chat' THEN
    SELECT to_jsonb(t), t.uid INTO v_old, v_target_user FROM public.team_chat t WHERE t.id = p_message_id FOR UPDATE;
    UPDATE public.team_chat SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL, delete_reason = NULL WHERE id = p_message_id;
  ELSE
    RAISE EXCEPTION 'invalid_message_table';
  END IF;
  IF v_old IS NULL THEN RAISE EXCEPTION 'message_not_found'; END IF;

  PERFORM public.admin_log_action(v_admin, v_target_user, v_table, p_message_id::TEXT, 'restore_message', v_reason, v_old,
    jsonb_build_object('is_deleted', false), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'message_table', v_table, 'message_id', p_message_id);
END;
$$;


--
-- Name: admin_restore_run(text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_restore_run(p_run_table text, p_run_id uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_table TEXT := lower(trim(COALESCE(p_run_table, '')));
  v_old JSONB;
  v_target UUID;
BEGIN
  v_admin := public.admin_assert_permission('manage_runs');
  IF p_run_id IS NULL THEN RAISE EXCEPTION 'run_id_required'; END IF;

  IF v_table = 'run_history' THEN
    SELECT to_jsonb(r), r.user_id INTO v_old, v_target FROM public.run_history r WHERE r.id = p_run_id FOR UPDATE;
    UPDATE public.run_history SET status = 'valid', invalidated_at = NULL, invalidated_by = NULL, invalidation_reason = NULL, admin_note = v_reason WHERE id = p_run_id;
  ELSIF v_table = 'scores' THEN
    SELECT to_jsonb(s), s.user_id INTO v_old, v_target FROM public.scores s WHERE s.id = p_run_id FOR UPDATE;
    UPDATE public.scores SET status = 'valid', invalidated_at = NULL, invalidated_by = NULL, invalidation_reason = NULL, admin_note = v_reason WHERE id = p_run_id;
  ELSIF v_table = 'duel_match_results' THEN
    SELECT to_jsonb(d), d.user_id INTO v_old, v_target FROM public.duel_match_results d WHERE d.id = p_run_id FOR UPDATE;
    UPDATE public.duel_match_results SET status = 'valid', invalidated_at = NULL, invalidated_by = NULL, invalidation_reason = NULL, admin_note = v_reason WHERE id = p_run_id;
  ELSE
    RAISE EXCEPTION 'invalid_run_table';
  END IF;
  IF v_old IS NULL THEN RAISE EXCEPTION 'run_not_found'; END IF;

  PERFORM public.admin_log_action(v_admin, v_target, v_table, p_run_id::TEXT, 'restore_run', v_reason, v_old, jsonb_build_object('status', 'valid'), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'run_table', v_table, 'run_id', p_run_id);
END;
$$;


--
-- Name: admin_review_ban_appeal(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_review_ban_appeal(p_appeal_id uuid, p_decision text, p_response text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_appeal ban_appeals%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_decision');
  END IF;
  SELECT * INTO v_appeal FROM ban_appeals WHERE id = p_appeal_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'appeal_not_found');
  END IF;
  IF v_appeal.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'appeal_already_reviewed');
  END IF;
  UPDATE ban_appeals
    SET status = p_decision,
        admin_response = p_response,
        reviewed_by = auth.uid(),
        reviewed_at = NOW()
    WHERE id = p_appeal_id;
  IF p_decision = 'approved' AND v_appeal.ban_id IS NOT NULL THEN
    UPDATE user_bans SET expires_at = NOW() WHERE id = v_appeal.ban_id;
  END IF;
  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: admin_search_clans(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_search_clans(p_query text DEFAULT ''::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_limit INTEGER := LEAST(100, GREATEST(1, COALESCE(p_limit, 50)));
  v_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
  v_q TEXT := '%' || lower(trim(COALESCE(p_query, ''))) || '%';
  v_items JSONB;
BEGIN
  v_admin := public.admin_assert_permission('manage_clans');

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT t.*, owner.user_id AS owner_id, u.pseudo AS owner_pseudo,
           (SELECT COUNT(*) FROM public.team_members tm WHERE tm.team_id = t.id) AS member_count,
           (SELECT MAX(created_at) FROM public.team_chat tc WHERE tc.team_id = t.id) AS last_chat_at
    FROM public.teams t
    LEFT JOIN public.team_members owner ON owner.team_id = t.id AND owner.role = 'owner'
    LEFT JOIN public.users u ON u.id = owner.user_id
    WHERE trim(COALESCE(p_query,'')) = ''
       OR lower(COALESCE(t.name,'')) LIKE v_q
       OR lower(COALESCE(t.tag,'')) LIKE v_q
       OR t.id::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%'
    ORDER BY t.created_at DESC
    LIMIT v_limit OFFSET v_offset
  ) x;

  RETURN jsonb_build_object('success', true, 'clans', v_items, 'limit', v_limit, 'offset', v_offset);
END;
$$;


--
-- Name: admin_search_duels(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_search_duels(p_query text DEFAULT ''::text, p_status text DEFAULT 'all'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_limit INTEGER := LEAST(100, GREATEST(1, COALESCE(p_limit, 50)));
  v_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
  v_q TEXT := '%' || lower(trim(COALESCE(p_query, ''))) || '%';
  v_status TEXT := lower(trim(COALESCE(p_status, 'all')));
  v_items JSONB;
BEGIN
  v_admin := public.admin_assert_permission('manage_duels');

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT d.id, d.status, d.mode, d.created_at, d.accepted_at, d.started_at, d.ends_at, d.completed_at, d.winner_uid,
           d.wager_credits, d.wager_tokens, d.admin_resolution,
           d.challenger_uid, cu.pseudo AS challenger_pseudo,
           d.opponent_uid, ou.pseudo AS opponent_pseudo,
           cr.score AS challenger_score, cr.status AS challenger_score_status,
           orr.score AS opponent_score, orr.status AS opponent_score_status,
           cls.state AS challenger_state, cls.elapsed_ms AS challenger_elapsed_ms,
           ols.state AS opponent_state, ols.elapsed_ms AS opponent_elapsed_ms,
           (d.status = 'active' AND COALESCE(d.ends_at, d.created_at + INTERVAL '15 minutes') < NOW()) AS is_stuck,
           (COALESCE(cr.score, 0) <= 0 OR COALESCE(orr.score, 0) <= 0) AS has_missing_or_zero_score
    FROM public.duel_matches d
    JOIN public.users cu ON cu.id = d.challenger_uid
    JOIN public.users ou ON ou.id = d.opponent_uid
    LEFT JOIN public.duel_match_results cr ON cr.match_id = d.id AND cr.user_id = d.challenger_uid
    LEFT JOIN public.duel_match_results orr ON orr.match_id = d.id AND orr.user_id = d.opponent_uid
    LEFT JOIN public.duel_run_states cls ON cls.match_id = d.id AND cls.user_id = d.challenger_uid
    LEFT JOIN public.duel_run_states ols ON ols.match_id = d.id AND ols.user_id = d.opponent_uid
    WHERE (v_status = 'all' OR lower(d.status) = v_status OR (v_status='stuck' AND d.status='active' AND COALESCE(d.ends_at, d.created_at + INTERVAL '15 minutes') < NOW()))
      AND (trim(COALESCE(p_query,'')) = '' OR d.id::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%' OR lower(COALESCE(cu.pseudo,'')) LIKE v_q OR lower(COALESCE(ou.pseudo,'')) LIKE v_q OR d.challenger_uid::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%' OR d.opponent_uid::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%')
    ORDER BY d.created_at DESC
    LIMIT v_limit OFFSET v_offset
  ) x;

  RETURN jsonb_build_object('success', true, 'duels', v_items, 'limit', v_limit, 'offset', v_offset);
END;
$$;


--
-- Name: admin_search_messages(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_search_messages(p_kind text DEFAULT 'global'::text, p_query text DEFAULT ''::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_kind TEXT := lower(trim(COALESCE(p_kind, 'global')));
  v_limit INTEGER := LEAST(100, GREATEST(1, COALESCE(p_limit, 50)));
  v_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
  v_q TEXT := '%' || lower(trim(COALESCE(p_query, ''))) || '%';
  v_items JSONB;
BEGIN
  v_admin := public.admin_assert_permission('manage_messages');

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT 'global_chat'::TEXT AS message_table, gc.id::TEXT AS id, gc.uid AS user_id, COALESCE(u.pseudo, gc.pseudo) AS pseudo,
           gc.text AS body, gc.created_at, COALESCE(gc.is_deleted,FALSE) AS is_deleted, gc.deleted_at, gc.delete_reason, NULL::UUID AS context_id
    FROM public.global_chat gc
    LEFT JOIN public.users u ON u.id = gc.uid
    WHERE v_kind IN ('global','global_chat','all')
      AND (trim(COALESCE(p_query,'')) = '' OR lower(COALESCE(gc.text,'')) LIKE v_q OR lower(COALESCE(u.pseudo,'')) LIKE v_q OR gc.uid::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%')
    UNION ALL
    SELECT 'direct_messages'::TEXT, dm.id::TEXT, dm.from_uid, COALESCE(u.pseudo, dm.from_pseudo), dm.message, dm.sent_at, COALESCE(dm.is_deleted,FALSE), dm.deleted_at, dm.delete_reason, dm.to_uid
    FROM public.direct_messages dm
    LEFT JOIN public.users u ON u.id = dm.from_uid
    WHERE v_kind IN ('direct','direct_messages','dm','all')
      AND (trim(COALESCE(p_query,'')) = '' OR lower(COALESCE(dm.message,'')) LIKE v_q OR lower(COALESCE(u.pseudo,'')) LIKE v_q OR dm.from_uid::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%')
    UNION ALL
    SELECT 'team_chat'::TEXT, tc.id::TEXT, tc.uid, COALESCE(u.pseudo, 'Anonyme'), tc.text, tc.created_at, COALESCE(tc.is_deleted,FALSE), tc.deleted_at, tc.delete_reason, tc.team_id
    FROM public.team_chat tc
    LEFT JOIN public.users u ON u.id = tc.uid
    WHERE v_kind IN ('team','team_chat','clan','all')
      AND (trim(COALESCE(p_query,'')) = '' OR lower(COALESCE(tc.text,'')) LIKE v_q OR lower(COALESCE(u.pseudo,'')) LIKE v_q OR tc.uid::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%')
    ORDER BY created_at DESC
    LIMIT v_limit OFFSET v_offset
  ) x;

  RETURN jsonb_build_object('success', true, 'messages', v_items, 'limit', v_limit, 'offset', v_offset);
END;
$$;


--
-- Name: admin_search_runs(text, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_search_runs(p_query text DEFAULT ''::text, p_status text DEFAULT 'all'::text, p_source text DEFAULT 'all'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_limit INTEGER := LEAST(100, GREATEST(1, COALESCE(p_limit, 50)));
  v_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
  v_q TEXT := '%' || lower(trim(COALESCE(p_query, ''))) || '%';
  v_status TEXT := lower(trim(COALESCE(p_status, 'all')));
  v_source TEXT := lower(trim(COALESCE(p_source, 'all')));
  v_items JSONB;
BEGIN
  v_admin := public.admin_assert_permission('manage_runs');

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT 'run_history'::TEXT AS run_table, rh.id::TEXT AS id, rh.user_id, u.pseudo, rh.duration AS time_value, 'history'::TEXT AS category,
           rh.status, rh.source, rh.created_at, rh.invalidated_at, rh.invalidation_reason, NULL::UUID AS duel_id
    FROM public.run_history rh
    LEFT JOIN public.users u ON u.id = rh.user_id
    WHERE (v_status = 'all' OR lower(COALESCE(rh.status,'valid')) = v_status)
      AND (v_source = 'all' OR lower(COALESCE(rh.source,'user')) = v_source)
      AND (trim(COALESCE(p_query,'')) = '' OR lower(COALESCE(u.pseudo,'')) LIKE v_q OR rh.user_id::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%' OR rh.id::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%')
    UNION ALL
    SELECT 'scores'::TEXT, s.id::TEXT, s.user_id, u.pseudo, s.time, s.category, s.status, s.source, s.created_at, s.invalidated_at, s.invalidation_reason, NULL::UUID
    FROM public.scores s
    LEFT JOIN public.users u ON u.id = s.user_id
    WHERE (v_status = 'all' OR lower(COALESCE(s.status,'valid')) = v_status)
      AND (v_source = 'all' OR lower(COALESCE(s.source,'user')) = v_source)
      AND (trim(COALESCE(p_query,'')) = '' OR lower(COALESCE(u.pseudo,'')) LIKE v_q OR s.user_id::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%' OR s.id::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%')
    UNION ALL
    SELECT 'duel_match_results'::TEXT, dmr.id::TEXT, dmr.user_id, u.pseudo, dmr.score, 'duel'::TEXT, dmr.status, dmr.source, dmr.submitted_at, dmr.invalidated_at, dmr.invalidation_reason, dmr.match_id
    FROM public.duel_match_results dmr
    LEFT JOIN public.users u ON u.id = dmr.user_id
    WHERE (v_status = 'all' OR lower(COALESCE(dmr.status,'valid')) = v_status)
      AND (v_source = 'all' OR lower(COALESCE(dmr.source,'duel')) = v_source)
      AND (trim(COALESCE(p_query,'')) = '' OR lower(COALESCE(u.pseudo,'')) LIKE v_q OR dmr.user_id::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%' OR dmr.id::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%' OR dmr.match_id::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%')
    ORDER BY created_at DESC
    LIMIT v_limit OFFSET v_offset
  ) x;

  RETURN jsonb_build_object('success', true, 'runs', v_items, 'limit', v_limit, 'offset', v_offset);
END;
$$;


--
-- Name: admin_search_users(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_search_users(p_query text DEFAULT ''::text, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_limit INTEGER := LEAST(100, GREATEST(1, COALESCE(p_limit, 25)));
  v_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
  v_q TEXT := '%' || lower(trim(COALESCE(p_query, ''))) || '%';
  v_items JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_admin_permission('manage_users') OR public.has_admin_permission('manage_bans')) THEN
    RAISE EXCEPTION 'not_admin_or_missing_permission:manage_users';
  END IF;
  v_admin := auth.uid();

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      u.id, u.email, u.username, u.pseudo, u.role, u.is_banned, u.created_at, u.updated_at,
      u."userLevel", u.xp, u.grade,
      EXISTS (SELECT 1 FROM public.user_bans b WHERE b.user_id = u.id AND b.is_active = TRUE AND b.lifted_at IS NULL AND (b.expires_at IS NULL OR b.expires_at > NOW())) AS has_active_ban,
      (SELECT jsonb_agg(jsonb_build_object('id', b.id, 'ban_type', b.ban_type, 'reason', b.reason, 'expires_at', b.expires_at, 'created_at', b.created_at)) FROM public.user_bans b WHERE b.user_id = u.id AND b.is_active = TRUE AND b.lifted_at IS NULL) AS active_bans,
      vc.balance AS credits,
      vt.balance AS tokens,
      (SELECT COUNT(*) FROM public.run_history rh WHERE rh.user_id = u.id) AS run_count,
      (SELECT COUNT(*) FROM public.duel_matches d WHERE d.challenger_uid = u.id OR d.opponent_uid = u.id) AS duel_count,
      (SELECT team_id FROM public.team_members tm WHERE tm.user_id = u.id LIMIT 1) AS team_id
    FROM public.users u
    LEFT JOIN public.volt_credits vc ON vc.user_id = u.id
    LEFT JOIN public.volt_tokens vt ON vt.user_id = u.id
    WHERE trim(COALESCE(p_query,'')) = ''
       OR lower(COALESCE(u.pseudo,'')) LIKE v_q
       OR lower(COALESCE(u.email,'')) LIKE v_q
       OR lower(COALESCE(u.username,'')) LIKE v_q
       OR u.id::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%'
    ORDER BY u.created_at DESC
    LIMIT v_limit OFFSET v_offset
  ) x;

  RETURN jsonb_build_object('success', true, 'users', v_items, 'limit', v_limit, 'offset', v_offset);
END;
$$;


--
-- Name: admin_search_users(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_search_users(p_query text DEFAULT ''::text, p_status text DEFAULT 'all'::text, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_limit INTEGER := LEAST(100, GREATEST(1, COALESCE(p_limit, 25)));
  v_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
  v_q TEXT := '%' || lower(trim(COALESCE(p_query, ''))) || '%';
  v_status TEXT := lower(trim(COALESCE(p_status, 'all')));
  v_items JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_admin_permission('manage_users') OR public.has_admin_permission('manage_bans')) THEN
    RAISE EXCEPTION 'not_admin_or_missing_permission:manage_users';
  END IF;
  v_admin := auth.uid();

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      u.id, u.email, u.username, u.pseudo, u.role, u.is_banned, u.created_at, u.updated_at,
      u."userLevel", u.xp, u.grade,
      EXISTS (SELECT 1 FROM public.user_bans b WHERE b.user_id = u.id AND b.is_active = TRUE AND b.lifted_at IS NULL AND (b.expires_at IS NULL OR b.expires_at > NOW())) AS has_active_ban,
      (SELECT jsonb_agg(jsonb_build_object('id', b.id, 'ban_type', b.ban_type, 'reason', b.reason, 'expires_at', b.expires_at, 'created_at', b.created_at)) FROM public.user_bans b WHERE b.user_id = u.id AND b.is_active = TRUE AND b.lifted_at IS NULL) AS active_bans,
      vc.balance AS credits,
      vt.balance AS tokens,
      (SELECT COUNT(*) FROM public.run_history rh WHERE rh.user_id = u.id) AS run_count,
      (SELECT COUNT(*) FROM public.duel_matches d WHERE d.challenger_uid = u.id OR d.opponent_uid = u.id) AS duel_count,
      (SELECT team_id FROM public.team_members tm WHERE tm.user_id = u.id LIMIT 1) AS team_id
    FROM public.users u
    LEFT JOIN public.volt_credits vc ON vc.user_id = u.id
    LEFT JOIN public.volt_tokens vt ON vt.user_id = u.id
    WHERE (
        trim(COALESCE(p_query,'')) = ''
        OR lower(COALESCE(u.pseudo,'')) LIKE v_q
        OR lower(COALESCE(u.email,'')) LIKE v_q
        OR lower(COALESCE(u.username,'')) LIKE v_q
        OR u.id::text ILIKE '%' || trim(COALESCE(p_query,'')) || '%'
    )
    AND (
        v_status = 'all'
        OR (v_status = 'banned' AND (u.is_banned = TRUE OR EXISTS (SELECT 1 FROM public.user_bans b WHERE b.user_id = u.id AND b.is_active = TRUE AND b.lifted_at IS NULL AND (b.expires_at IS NULL OR b.expires_at > NOW()))))
        OR (v_status = 'active' AND u.is_banned = FALSE AND NOT EXISTS (SELECT 1 FROM public.user_bans b WHERE b.user_id = u.id AND b.is_active = TRUE AND b.lifted_at IS NULL AND (b.expires_at IS NULL OR b.expires_at > NOW())))
    )
    ORDER BY u.created_at DESC
    LIMIT v_limit OFFSET v_offset
  ) x;

  RETURN jsonb_build_object('success', true, 'users', v_items, 'limit', v_limit, 'offset', v_offset, 'status', v_status);
END;
$$;


--
-- Name: admin_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: admin_unban_user(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_unban_user(p_target_uid uuid, p_ban_type text DEFAULT 'global'::text, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_type TEXT := lower(trim(COALESCE(p_ban_type, 'global')));
  v_old JSONB;
  v_count INTEGER := 0;
BEGIN
  v_admin := public.admin_assert_permission('manage_bans');
  IF p_target_uid IS NULL THEN RAISE EXCEPTION 'target_user_required'; END IF;
  IF v_type NOT IN ('global','chat','leaderboard','runs','duels','clans','all') THEN RAISE EXCEPTION 'invalid_ban_type'; END IF;

  SELECT to_jsonb(u) INTO v_old FROM public.users u WHERE u.id = p_target_uid FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'target_user_not_found'; END IF;

  UPDATE public.user_bans
  SET is_active = FALSE, lifted_by = v_admin, lifted_at = NOW(), lift_reason = v_reason, updated_at = NOW()
  WHERE user_id = p_target_uid
    AND is_active = TRUE
    AND lifted_at IS NULL
    AND (v_type = 'all' OR ban_type = v_type);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_type IN ('global','all') THEN
    UPDATE public.users
    SET is_banned = FALSE,
        settings = COALESCE(settings, '{}'::jsonb) - 'ban_reason',
        updated_at = NOW()
    WHERE id = p_target_uid
      AND NOT EXISTS (
        SELECT 1 FROM public.user_bans b
        WHERE b.user_id = p_target_uid AND b.ban_type = 'global' AND b.is_active = TRUE AND b.lifted_at IS NULL AND (b.expires_at IS NULL OR b.expires_at > NOW())
      );
  END IF;

  PERFORM public.admin_log_action(v_admin, p_target_uid, 'user', p_target_uid::TEXT, 'unban_' || v_type, v_reason, v_old,
    jsonb_build_object('lifted_count', v_count), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'user_id', p_target_uid, 'ban_type', v_type, 'lifted_count', v_count);
END;
$$;


--
-- Name: admin_update_admin_role(uuid, text, text[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_update_admin_role(p_target_uid uuid, p_role text, p_permissions text[] DEFAULT NULL::text[], p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_role TEXT := lower(trim(COALESCE(p_role, '')));
  v_old JSONB;
BEGIN
  v_admin := public.admin_assert_permission('manage_admin_roles');
  IF p_target_uid IS NULL THEN RAISE EXCEPTION 'target_user_required'; END IF;
  IF v_role NOT IN ('owner','admin','moderator','support') THEN RAISE EXCEPTION 'invalid_admin_role'; END IF;
  IF p_target_uid = v_admin AND v_role <> 'owner' THEN RAISE EXCEPTION 'owner_cannot_downgrade_self'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_target_uid) THEN RAISE EXCEPTION 'target_user_not_found'; END IF;

  SELECT to_jsonb(ar) INTO v_old FROM public.admin_roles ar WHERE ar.user_id = p_target_uid;
  INSERT INTO public.admin_roles(user_id, role, permissions, is_active, created_by, updated_by)
  VALUES (p_target_uid, v_role, COALESCE(p_permissions, public.admin_default_permissions(v_role)), TRUE, v_admin, v_admin)
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        is_active = TRUE,
        updated_by = v_admin,
        updated_at = NOW();

  PERFORM public.admin_log_action(v_admin, p_target_uid, 'admin_role', p_target_uid::TEXT, 'update_admin_role', v_reason, v_old,
    jsonb_build_object('role', v_role, 'permissions', COALESCE(p_permissions, public.admin_default_permissions(v_role))), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'user_id', p_target_uid, 'role', v_role);
END;
$$;


--
-- Name: admin_update_run_time(text, uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_update_run_time(p_run_table text, p_run_id uuid, p_new_time numeric, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin_id uuid;
  v_old jsonb;
BEGIN
  v_admin_id := admin_assert_permission('manage_runs');

  IF p_new_time IS NULL OR NOT (p_new_time > 0) OR p_new_time > 43200 THEN
    RAISE EXCEPTION 'invalid_run_time' USING ERRCODE = 'P0001';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = 'P0001';
  END IF;

  IF p_run_table = 'run_history' THEN
    SELECT to_jsonb(rh.*) INTO v_old FROM run_history rh WHERE id = p_run_id;
    IF v_old IS NULL THEN RAISE EXCEPTION 'run_not_found' USING ERRCODE = 'P0001'; END IF;
    UPDATE run_history
       SET original_duration = COALESCE(original_duration, duration),
           duration = p_new_time,
           updated_by_admin = v_admin_id,
           admin_note = p_reason
     WHERE id = p_run_id;
  ELSIF p_run_table = 'duel_match_results' THEN
    SELECT to_jsonb(dmr.*) INTO v_old FROM duel_match_results dmr WHERE id = p_run_id;
    IF v_old IS NULL THEN RAISE EXCEPTION 'run_not_found' USING ERRCODE = 'P0001'; END IF;
    UPDATE duel_match_results
       SET original_score = COALESCE(original_score, score),
           score = p_new_time,
           admin_note = p_reason
     WHERE id = p_run_id;
  ELSIF p_run_table = 'scores' THEN
    SELECT to_jsonb(s.*) INTO v_old FROM scores s WHERE id = p_run_id;
    IF v_old IS NULL THEN RAISE EXCEPTION 'run_not_found' USING ERRCODE = 'P0001'; END IF;
    UPDATE scores
       SET original_time = COALESCE(original_time, time),
           time = p_new_time,
           updated_by_admin = v_admin_id,
           admin_note = p_reason
     WHERE id = p_run_id;
  ELSE
    RAISE EXCEPTION 'invalid_table' USING ERRCODE = 'P0001';
  END IF;

  PERFORM admin_log_action(
    v_admin_id, NULL, p_run_table, p_run_id::text,
    'admin_update_run_time', p_reason, v_old,
    jsonb_build_object('new_time', p_new_time)
  );

  RETURN jsonb_build_object('success', true, 'new_time', p_new_time);
END $$;


--
-- Name: admin_void_duel(uuid, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_void_duel(p_match_id uuid, p_reason text, p_refund_tokens boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_admin UUID;
  v_reason TEXT := public.admin_clean_reason(p_reason);
  v_old public.duel_matches%ROWTYPE;
BEGIN
  v_admin := public.admin_assert_permission('manage_duels');
  IF p_match_id IS NULL THEN RAISE EXCEPTION 'match_id_required'; END IF;
  SELECT * INTO v_old FROM public.duel_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'duel_not_found'; END IF;

  UPDATE public.duel_matches
  SET status = 'voided', completed_at = COALESCE(completed_at, NOW()), voided_at = NOW(), voided_by = v_admin, winner_uid = NULL,
      admin_note = v_reason, admin_resolution = COALESCE(admin_resolution,'{}'::jsonb) || jsonb_build_object('action','voided','reason',v_reason,'refunded',p_refund_tokens)
  WHERE id = p_match_id;
  UPDATE public.duel_match_results SET status = 'admin_voided', invalidated_at = NOW(), invalidated_by = v_admin, invalidation_reason = v_reason WHERE match_id = p_match_id AND COALESCE(status,'valid') = 'valid';
  UPDATE public.duel_run_states SET state = 'finished', last_seen_at = NOW(), updated_at = NOW() WHERE match_id = p_match_id AND state IN ('idle','running');

  IF p_refund_tokens AND to_regprocedure('public.refund_duel_escrow(uuid)') IS NOT NULL THEN
    PERFORM public.refund_duel_escrow(p_match_id);
  END IF;

  PERFORM public.admin_log_action(v_admin, NULL, 'duel', p_match_id::TEXT, 'void_duel', v_reason, to_jsonb(v_old), jsonb_build_object('status','voided','refund_tokens',p_refund_tokens), '{}'::jsonb);
  RETURN jsonb_build_object('success', true, 'match_id', p_match_id, 'status', 'voided');
END;
$$;


--
-- Name: apply_ban(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_ban(target_uid uuid, ban_reason text DEFAULT 'Violation des conditions d''utilisation'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  caller_hwid TEXT;
  target_hwid TEXT;
  is_caller_blacklisted BOOLEAN;
BEGIN
  -- 1. Si l'appelant est Admin, il peut bannir n'importe qui
  IF public.is_admin() THEN
    UPDATE public.users 
    SET is_banned = true, 
        settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{ban_reason}', to_jsonb(ban_reason))
    WHERE id = target_uid;
    RETURN;
  END IF;

  -- 2. Cas de l'auto-bannissement (propagation HWID)
  -- L'utilisateur ne peut se bannir lui-même que si son HWID est dans la blacklist
  IF auth.uid() = target_uid THEN
    SELECT hwid INTO target_hwid FROM public.users WHERE id = target_uid;
    
    IF target_hwid IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM public.blacklist WHERE identifier = target_hwid) INTO is_caller_blacklisted;
      
      IF is_caller_blacklisted THEN
        UPDATE public.users SET is_banned = true WHERE id = target_uid;
        RETURN;
      END IF;
    END IF;
  END IF;

  RAISE EXCEPTION 'Permission denied: unauthorized ban attempt.';
END;
$$;


--
-- Name: apply_duel_elo(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_duel_elo(p_match_id uuid, p_source text DEFAULT 'server'::text, p_reason text DEFAULT 'duel_completed'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_match public.duel_matches%ROWTYPE;
  v_ch public.player_elo%ROWTYPE;
  v_op public.player_elo%ROWTYPE;
  v_winner UUID;
  v_loser UUID;
  v_winner_old INTEGER;
  v_loser_old INTEGER;
  v_winner_new INTEGER;
  v_loser_new INTEGER;
  v_expected NUMERIC;
  v_k NUMERIC := 32;
  v_wager INTEGER := 0;
  v_multiplier NUMERIC := 1.0;
  v_delta INTEGER := 0;
  v_duel_type TEXT := 'normal';
BEGIN
  IF p_match_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'match_required'); END IF;

  SELECT * INTO v_match FROM public.duel_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'match_not_found'); END IF;
  IF COALESCE(v_match.elo_processed, FALSE) THEN RETURN jsonb_build_object('success', true, 'already_processed', true, 'match_id', p_match_id, 'winner_uid', v_match.winner_uid, 'winner_delta', v_match.elo_winner_delta, 'loser_delta', v_match.elo_loser_delta); END IF;
  IF v_match.status <> 'completed' THEN RETURN jsonb_build_object('success', false, 'error', 'match_not_completed', 'match_id', p_match_id, 'status', v_match.status); END IF;

  IF COALESCE(v_match.is_bot_match, FALSE) OR v_match.opponent_uid IS NULL THEN
    UPDATE public.duel_matches
    SET elo_processed = TRUE, elo_processed_at = NOW(), elo_winner_delta = 0, elo_loser_delta = 0
    WHERE id = v_match.id;
    RETURN jsonb_build_object('success', true, 'match_id', v_match.id, 'bot_match', true, 'delta', 0);
  END IF;

  PERFORM public.ensure_player_elo(v_match.challenger_uid);
  PERFORM public.ensure_player_elo(v_match.opponent_uid);
  PERFORM 1 FROM public.player_elo pe WHERE pe.user_id IN (v_match.challenger_uid, v_match.opponent_uid) ORDER BY pe.user_id FOR UPDATE;

  SELECT * INTO v_ch FROM public.player_elo WHERE user_id = v_match.challenger_uid;
  SELECT * INTO v_op FROM public.player_elo WHERE user_id = v_match.opponent_uid;

  v_wager := GREATEST(0, COALESCE(v_match.wager_tokens, v_match.wager_credits, 0));
  v_duel_type := CASE WHEN v_wager > 0 THEN 'token' ELSE 'normal' END;
  v_multiplier := CASE
    WHEN v_wager <= 0 THEN 1.00
    ELSE LEAST(2.00, 1.15 + (ln((1 + LEAST(v_wager, 100))::NUMERIC) / ln(101::NUMERIC)) * 0.85)
  END;

  IF v_match.winner_uid IS NULL THEN
    INSERT INTO public.elo_history(user_id, duel_id, opponent_id, old_elo, new_elo, elo_delta, result, duel_type, token_wager, reason, validation_source)
    VALUES
      (v_match.challenger_uid, v_match.id, v_match.opponent_uid, v_ch.duel_elo, v_ch.duel_elo, 0, 'draw', v_duel_type, v_wager, p_reason, p_source),
      (v_match.opponent_uid, v_match.id, v_match.challenger_uid, v_op.duel_elo, v_op.duel_elo, 0, 'draw', v_duel_type, v_wager, p_reason, p_source)
    ON CONFLICT (duel_id, user_id) DO NOTHING;

    UPDATE public.player_elo
    SET duels_played = duels_played + 1, draws = draws + 1, current_win_streak = 0, updated_at = NOW()
    WHERE user_id IN (v_match.challenger_uid, v_match.opponent_uid);

    UPDATE public.duel_matches SET elo_processed = TRUE, elo_processed_at = NOW(), elo_winner_delta = 0, elo_loser_delta = 0 WHERE id = v_match.id;
    PERFORM public.sync_user_elo_cache(v_match.challenger_uid);
    PERFORM public.sync_user_elo_cache(v_match.opponent_uid);
    RETURN jsonb_build_object('success', true, 'match_id', v_match.id, 'draw', true, 'delta', 0, 'wager_tokens', v_wager, 'multiplier', v_multiplier);
  END IF;

  IF v_match.winner_uid = v_match.challenger_uid THEN
    v_winner := v_match.challenger_uid; v_loser := v_match.opponent_uid; v_winner_old := v_ch.duel_elo; v_loser_old := v_op.duel_elo;
  ELSIF v_match.winner_uid = v_match.opponent_uid THEN
    v_winner := v_match.opponent_uid; v_loser := v_match.challenger_uid; v_winner_old := v_op.duel_elo; v_loser_old := v_ch.duel_elo;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'winner_not_participant', 'match_id', v_match.id);
  END IF;

  v_expected := 1.0 / (1.0 + power(10.0, ((v_loser_old - v_winner_old)::NUMERIC / 400.0)));
  v_delta := LEAST(80, GREATEST(1, ROUND(v_k * (1.0 - v_expected) * v_multiplier)::INTEGER));

  v_winner_new := GREATEST(100, v_winner_old + v_delta);
  v_loser_new := GREATEST(100, v_loser_old - v_delta);

  UPDATE public.player_elo
  SET duel_elo = v_winner_new, global_elo = v_winner_new, duels_played = duels_played + 1, wins = wins + 1,
      current_win_streak = current_win_streak + 1, best_win_streak = GREATEST(best_win_streak, current_win_streak + 1),
      tokens_won_from_duels = tokens_won_from_duels + CASE WHEN v_wager > 0 THEN v_wager ELSE 0 END, updated_at = NOW()
  WHERE user_id = v_winner;

  UPDATE public.player_elo
  SET duel_elo = v_loser_new, global_elo = v_loser_new, duels_played = duels_played + 1, losses = losses + 1,
      current_win_streak = 0, tokens_lost_from_duels = tokens_lost_from_duels + CASE WHEN v_wager > 0 THEN v_wager ELSE 0 END, updated_at = NOW()
  WHERE user_id = v_loser;

  INSERT INTO public.elo_history(user_id, duel_id, opponent_id, old_elo, new_elo, elo_delta, result, duel_type, token_wager, reason, validation_source)
  VALUES
    (v_winner, v_match.id, v_loser, v_winner_old, v_winner_new, v_delta, 'win', v_duel_type, v_wager, p_reason, p_source),
    (v_loser, v_match.id, v_winner, v_loser_old, v_loser_new, -v_delta, 'loss', v_duel_type, v_wager, p_reason, p_source)
  ON CONFLICT (duel_id, user_id) DO NOTHING;

  UPDATE public.duel_matches
  SET elo_processed = TRUE, elo_processed_at = NOW(), elo_winner_delta = v_delta, elo_loser_delta = -v_delta
  WHERE id = v_match.id;

  PERFORM public.sync_user_elo_cache(v_winner);
  PERFORM public.sync_user_elo_cache(v_loser);

  RETURN jsonb_build_object('success', true, 'match_id', v_match.id, 'winner_uid', v_winner, 'loser_uid', v_loser, 'winner_delta', v_delta, 'loser_delta', -v_delta, 'wager_tokens', v_wager, 'multiplier', ROUND(v_multiplier, 3));
END;
$$;


--
-- Name: apply_hwid_ban(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_hwid_ban(p_hwid text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only.';
  END IF;
  IF p_hwid IS NULL OR p_hwid = '' THEN RETURN; END IF;
  UPDATE public.users SET is_banned = true WHERE hwid = p_hwid;
END;
$$;


--
-- Name: apply_token_delta(uuid, integer, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_token_delta(p_user_id uuid, p_amount integer, p_type text, p_description text DEFAULT NULL::text, p_ref_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_balance integer;
  v_new_balance integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user';
  END IF;
  IF p_amount = 0 THEN
    -- still record a zero-amount audit row (useful for season_reward 0-grants)
    INSERT INTO public.volt_token_transactions(user_id, amount, type, description, ref_id)
    VALUES (p_user_id, 0, p_type, p_description, p_ref_id);
    RETURN jsonb_build_object('success', true, 'balance', NULL);
  END IF;
  IF p_type NOT IN (
    'admin_grant','admin_revoke','duel_escrow','duel_win','duel_refund',
    'purchase','payment_refund','payment_chargeback',
    'season_reward','tournament_entry','tournament_prize',
    'referral_bonus'
  ) THEN
    RAISE EXCEPTION 'invalid_token_transaction_type: %', p_type;
  END IF;

  INSERT INTO public.volt_tokens(user_id, balance, total_granted, updated_at)
  VALUES (p_user_id, 0, 0, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance FROM public.volt_tokens
   WHERE user_id = p_user_id FOR UPDATE;

  v_new_balance := v_balance + p_amount;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'insufficient_tokens' USING DETAIL = format('have=%s need=%s', v_balance, -p_amount);
  END IF;

  UPDATE public.volt_tokens
     SET balance = v_new_balance,
         total_granted = CASE WHEN p_amount > 0 THEN total_granted + p_amount ELSE total_granted END,
         updated_at = NOW()
   WHERE user_id = p_user_id;

  INSERT INTO public.volt_token_transactions(user_id, amount, type, description, ref_id)
  VALUES (p_user_id, p_amount, p_type, p_description, p_ref_id);

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END $$;


--
-- Name: apply_token_delta(uuid, integer, character varying, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_token_delta(p_user_id uuid, p_amount integer, p_type character varying DEFAULT 'admin_grant'::character varying, p_description text DEFAULT NULL::text, p_ref_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF p_user_id IS NULL OR COALESCE(p_amount, 0) = 0 THEN
    RETURN;
  END IF;
  IF p_type NOT IN ('admin_grant','admin_revoke','duel_escrow','duel_win','duel_refund') THEN
    RAISE EXCEPTION 'invalid_token_transaction_type';
  END IF;

  INSERT INTO public.volt_tokens(user_id, balance, total_granted)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance
  FROM public.volt_tokens
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF COALESCE(v_balance, 0) + p_amount < 0 THEN
    RAISE EXCEPTION 'insufficient_tokens';
  END IF;

  UPDATE public.volt_tokens
  SET balance = balance + p_amount,
      total_granted = CASE WHEN p_amount > 0 AND p_type = 'admin_grant'
                           THEN total_granted + p_amount ELSE total_granted END,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.volt_token_transactions(user_id, amount, type, description, ref_id, created_by)
  VALUES (p_user_id, p_amount, p_type, p_description, p_ref_id, auth.uid());
END;
$$;


--
-- Name: assign_grade(uuid, character varying, integer, integer, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_grade(p_user_id uuid, p_grade character varying, p_duration_days integer DEFAULT NULL::integer, p_amount_cents integer DEFAULT 0, p_payment_method character varying DEFAULT 'manual'::character varying, p_payment_ref character varying DEFAULT NULL::character varying) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expires TIMESTAMPTZ;
  v_badge   VARCHAR(10);
  v_color   VARCHAR(7);
  v_rainbow BOOLEAN;
BEGIN
  -- Sécurité : Autoriser l'admin (y compris bypass SQL Editor / service_role)
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : privilèges insuffisants pour assigner un grade.';
  END IF;

  -- Calculer expiration
  IF p_duration_days IS NOT NULL THEN
    v_expires := NOW() + (p_duration_days || ' days')::INTERVAL;
  ELSE
    v_expires := NULL; -- lifetime
  END IF;

  -- Badge et couleur par défaut selon grade
  CASE p_grade
    WHEN 'legend' THEN v_badge := '👑'; v_color := '#f59e0b'; v_rainbow := TRUE;
    WHEN 'elite'  THEN v_badge := '💎'; v_color := '#6366f1'; v_rainbow := FALSE;
    WHEN 'star'   THEN v_badge := '⭐'; v_color := '#c17f59'; v_rainbow := FALSE;
    ELSE RAISE EXCEPTION 'Grade invalide: %', p_grade;
  END CASE;

  -- Désactiver les anciens abonnements actifs
  UPDATE public.premium_subscriptions
  SET is_active = FALSE
  WHERE user_id = p_user_id AND is_active = TRUE;

  -- Insérer le nouvel abonnement
  INSERT INTO public.premium_subscriptions
    (user_id, grade, payment_ref, payment_method, amount_cents, expires_at, granted_by)
  VALUES
    (p_user_id, p_grade, p_payment_ref, p_payment_method, p_amount_cents, v_expires,
     CASE WHEN public.is_admin() THEN auth.uid() ELSE NULL END);

  -- Mettre à jour le profil utilisateur
  UPDATE public.users
  SET
    grade            = p_grade,
    grade_expires_at = v_expires,
    grade_badge      = v_badge,
    grade_color      = v_color,
    grade_color_mode = 'solid',
    grade_color_2    = NULL,
    grade_color_angle = 90,
    grade_rainbow    = v_rainbow,
    updated_at       = NOW()
  WHERE id = p_user_id;
END;
$$;


--
-- Name: auto_provision_hmac_secret(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_provision_hmac_secret() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.user_hmac_secrets(user_id, secret_b64)
  VALUES (NEW.id, encode(gen_random_bytes(32), 'base64'))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;


--
-- Name: ban_ip_address(inet, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ban_ip_address(p_ip inet, p_reason text, p_duration_hours integer DEFAULT NULL::integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;
  INSERT INTO ip_bans (ip_address, reason, banned_by, expires_at)
  VALUES (
    p_ip::INET, p_reason, auth.uid(),
    CASE WHEN p_duration_hours IS NOT NULL
      THEN NOW() + (p_duration_hours || ' hours')::INTERVAL
      ELSE NULL
    END
  )
  ON CONFLICT (ip_address) DO UPDATE
    SET reason = p_reason, expires_at = EXCLUDED.expires_at;
  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: block_user_for_duels(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.block_user_for_duels(p_target_uid uuid, p_hours integer DEFAULT 24, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_target_uid IS NULL OR p_target_uid = v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_target');
  END IF;
  IF p_hours IS NULL OR p_hours <= 0 THEN p_hours := 24; END IF;
  IF p_hours > 24 * 365 THEN p_hours := 24 * 365; END IF;
  v_expires := now() + (p_hours || ' hours')::interval;

  INSERT INTO user_blocks (user_id, blocked_uid, kind, reason, expires_at)
  VALUES (v_uid, p_target_uid, 'duels', p_reason, v_expires)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'expires_at', v_expires);
END $$;


--
-- Name: bump_suspicion(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bump_suspicion(p_uid uuid, p_delta integer, p_reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF p_uid IS NULL THEN RETURN; END IF;
  UPDATE users
     SET suspicion_score = LEAST(1000, GREATEST(0, suspicion_score + p_delta))
   WHERE id = p_uid;

  INSERT INTO admin_audit_logs (
    admin_id, target_user_id, target_type, target_id,
    action, reason, metadata, created_at
  ) VALUES (
    NULL, p_uid, 'user', p_uid::text,
    'suspicion_bump', COALESCE(p_reason, 'auto'),
    jsonb_build_object('delta', p_delta), now()
  );
END $$;


--
-- Name: buy_team_slots(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.buy_team_slots(p_team_id uuid, p_slots integer DEFAULT 5) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_owner       UUID;
  v_cur_max     INTEGER;
  v_new_max     INTEGER;
  v_cost        INTEGER;
  v_balance     INTEGER;
  SLOT_PRICE    CONSTANT INTEGER := 50;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_slots < 1 OR p_slots > 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_slot_count');
  END IF;

  SELECT owner_id, max_members INTO v_owner, v_cur_max
  FROM public.teams WHERE id = p_team_id;

  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'team_not_found');
  END IF;
  IF v_owner != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_owner');
  END IF;

  v_new_max := v_cur_max + p_slots;
  IF v_new_max > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'max_cap_exceeded', 'max', 50);
  END IF;

  v_cost := p_slots * SLOT_PRICE;

  SELECT COALESCE(balance, 0) INTO v_balance
  FROM public.volt_credits WHERE user_id = v_user_id;

  IF v_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits',
      'need', v_cost, 'have', v_balance);
  END IF;

  PERFORM public.grant_credits_to_user(
    v_user_id, -v_cost, 'team_slot_purchase',
    format('Achat de %s place(s) pour la team', p_slots), p_team_id
  );

  UPDATE public.teams SET max_members = v_new_max WHERE id = p_team_id;

  RETURN jsonb_build_object('success', true, 'new_max', v_new_max, 'cost', v_cost);
END;
$$;


--
-- Name: cancel_account_deletion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_account_deletion() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_uid UUID := auth.uid(); v_banned boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  SELECT COALESCE(is_banned, false) INTO v_banned FROM public.users WHERE id = v_uid;
  IF v_banned THEN
    RETURN jsonb_build_object('success', false, 'error', 'banned_account_cannot_be_restored');
  END IF;
  UPDATE public.users
     SET deletion_requested_at = NULL,
         deleted_at = NULL,
         updated_at = NOW()
   WHERE id = v_uid;
  RETURN jsonb_build_object('success', true);
END $$;


--
-- Name: cancel_account_deletion(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_account_deletion(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE users SET deletion_requested_at = NULL WHERE id = p_user_id;
  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: cancel_duel(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_duel(p_match_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match public.duel_matches%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;

  SELECT * INTO v_match FROM public.duel_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND OR v_match.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'match_not_found'); END IF;
  IF v_match.challenger_uid <> v_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_duel_challenger'); END IF;
  IF v_match.accepted_at IS NOT NULL OR v_match.started_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'duel_already_started');
  END IF;

  PERFORM public.refund_duel_escrow(v_match.id);
  UPDATE public.duel_matches SET status = 'cancelled', completed_at = NOW() WHERE id = p_match_id;
  RETURN jsonb_build_object('success', true, 'status', 'cancelled', 'match_id', p_match_id);
END;
$$;


--
-- Name: change_pseudo(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.change_pseudo(p_new_pseudo text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_user_id UUID;
  v_count   INTEGER;
  v_exists  BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_new_pseudo !~ '^[a-zA-Z0-9_]{3,24}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_format');
  END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE LOWER(pseudo) = LOWER(p_new_pseudo) AND id != v_user_id
  ) INTO v_exists;
  IF v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_taken');
  END IF;
  SELECT pseudo_change_count INTO v_count FROM public.users WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;
  IF v_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'paid_required', 'count', v_count);
  END IF;
  UPDATE public.users
  SET pseudo = p_new_pseudo, pseudo_change_count = pseudo_change_count + 1
  WHERE id = v_user_id;
  RETURN jsonb_build_object('success', true, 'pseudo', p_new_pseudo);
END;
$_$;


--
-- Name: check_run_history_rate_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_run_history_rate_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_count integer;
  v_limit constant integer := 60;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_count
    FROM public.run_history
    WHERE user_id = NEW.user_id
      AND created_at > NOW() - interval '1 hour';
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'rate_limit_exceeded: more than % run inserts in last hour', v_limit
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: check_score_rate_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_score_rate_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.scores
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 hour';
  IF recent_count > 30 THEN
    RAISE EXCEPTION 'rate_limit_score_exceeded: %', NEW.user_id USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: check_score_sanity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_score_sanity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.time IS NOT NULL AND (NEW.time < 1 OR NEW.time > 43200) THEN
    RAISE EXCEPTION 'invalid_score_range: %s sec', NEW.time USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: claim_daily_reward(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_daily_reward(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
DECLARE
  v_last_claim DATE;
  v_streak     INTEGER;
  v_day_idx    INTEGER;
  v_reward     public.daily_rewards%ROWTYPE;
  v_new_balance INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT last_claim_date INTO v_last_claim FROM public.user_daily_claims WHERE user_id = p_user_id;
  IF v_last_claim = CURRENT_DATE THEN
    RETURN json_build_object('success', false, 'error', 'already_claimed');
  END IF;

  SELECT COALESCE(current_streak, 1) INTO v_streak FROM public.daily_login_streaks WHERE user_id = p_user_id;
  IF v_streak IS NULL THEN v_streak := 1; END IF;
  v_day_idx := ((v_streak - 1) % 30) + 1;

  SELECT * INTO v_reward FROM public.daily_rewards WHERE day = v_day_idx;
  IF v_reward.day IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'reward_not_found');
  END IF;

  IF v_reward.credits_reward > 0 THEN
    v_new_balance := public.grant_credits_to_user(
      p_user_id,
      v_reward.credits_reward,
      'gift',
      'Bonus quotidien jour ' || v_day_idx,
      NULL
    );
    UPDATE public.users SET credits = v_new_balance WHERE id = p_user_id;
  END IF;

  IF v_reward.xp_reward > 0 THEN
    BEGIN
      PERFORM public.add_user_xp(p_user_id, v_reward.xp_reward);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END IF;

  INSERT INTO public.user_daily_claims (user_id, last_claim_date, streak_at_claim)
  VALUES (p_user_id, CURRENT_DATE, v_streak)
  ON CONFLICT (user_id) DO UPDATE
    SET last_claim_date = CURRENT_DATE, streak_at_claim = v_streak;

  RETURN json_build_object(
    'success', true,
    'day', v_day_idx,
    'credits', v_reward.credits_reward,
    'xp', v_reward.xp_reward,
    'icon', v_reward.icon,
    'streak', v_streak
  );
END;
$$;


--
-- Name: claim_duel_no_start_win(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_duel_no_start_win(p_match_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_match RECORD;
  v_self_state RECORD;
  v_opp_uid uuid;
  v_opp_state RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  SELECT * INTO v_match FROM public.duel_matches
   WHERE id = p_match_id AND status = 'active'
     AND (challenger_uid = v_uid OR opponent_uid = v_uid)
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'match_not_found_or_inactive');
  END IF;
  IF COALESCE(v_match.is_bot_match, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'bot_match');
  END IF;
  IF v_match.started_at IS NULL OR v_match.started_at > NOW() - INTERVAL '2 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_early');
  END IF;

  v_opp_uid := CASE WHEN v_match.challenger_uid = v_uid THEN v_match.opponent_uid
                    ELSE v_match.challenger_uid END;

  SELECT * INTO v_self_state FROM public.duel_run_states
   WHERE match_id = p_match_id AND user_id = v_uid;
  IF NOT FOUND OR v_self_state.run_started_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_not_started');
  END IF;

  SELECT * INTO v_opp_state FROM public.duel_run_states
   WHERE match_id = p_match_id AND user_id = v_opp_uid;
  -- Opponent must NOT be alive. Tightening: if they've sent a heartbeat
  -- within the last 60s, refuse — they may just be starting late.
  IF FOUND THEN
    IF v_opp_state.run_started_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'opponent_already_started');
    END IF;
    IF v_opp_state.last_seen_at IS NOT NULL
       AND v_opp_state.last_seen_at > NOW() - INTERVAL '60 seconds' THEN
      RETURN jsonb_build_object('success', false, 'error', 'opponent_recently_alive');
    END IF;
  END IF;

  -- Opponent had a row but never started → declare caller winner
  UPDATE public.duel_matches
     SET status = 'completed',
         winner_uid = v_uid,
         finish_reason = 'no_start_forfeit',
         finished_at = NOW(),
         completed_at = NOW(),
         updated_at = NOW()
   WHERE id = p_match_id;
  PERFORM public.finish_duel_payout(p_match_id, v_uid);
  RETURN jsonb_build_object('success', true, 'winner_uid', v_uid);
END $$;


--
-- Name: claim_duel_partner_disconnect_win(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_duel_partner_disconnect_win(p_match_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_match RECORD;
  v_caller_state RECORD;
  v_opp_uid uuid;
  v_opp_last_seen timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_match FROM public.duel_matches
   WHERE id = p_match_id
     AND status = 'active'
     AND (challenger_uid = v_uid OR opponent_uid = v_uid)
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'match_not_found_or_inactive');
  END IF;
  IF COALESCE(v_match.is_bot_match, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'bot_match');
  END IF;

  IF v_match.started_at IS NULL OR v_match.started_at > NOW() - INTERVAL '5 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_early');
  END IF;

  v_opp_uid := CASE WHEN v_match.challenger_uid = v_uid THEN v_match.opponent_uid
                    ELSE v_match.challenger_uid END;

  SELECT * INTO v_caller_state FROM public.duel_run_states
   WHERE match_id = p_match_id AND user_id = v_uid;
  IF NOT FOUND OR v_caller_state.run_started_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'caller_not_started');
  END IF;

  SELECT last_seen_at INTO v_opp_last_seen FROM public.duel_run_states
   WHERE match_id = p_match_id AND user_id = v_opp_uid;
  IF v_opp_last_seen IS NOT NULL AND v_opp_last_seen > NOW() - INTERVAL '90 seconds' THEN
    RETURN jsonb_build_object('success', false, 'error', 'opponent_recently_alive');
  END IF;

  UPDATE public.duel_matches
     SET status = 'completed',
         winner_uid = v_uid,
         finish_reason = 'opponent_disconnect',
         finished_at = NOW(),
         completed_at = NOW(),
         updated_at = NOW()
   WHERE id = p_match_id;

  PERFORM public.finish_duel_payout(p_match_id, v_uid);

  RETURN jsonb_build_object('success', true, 'winner_uid', v_uid);
END $$;


--
-- Name: claim_monthly_credits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_monthly_credits() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_month_key  VARCHAR(7) := to_char(NOW(), 'YYYY-MM');
  v_grade      VARCHAR;
  v_credits    INTEGER;
  v_new_balance INTEGER;
  credit_map   JSONB := '{"star":50,"elite":100,"legend":200}'::JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF public.is_banned() THEN
    RETURN jsonb_build_object('success', false, 'error', 'banned');
  END IF;

  -- Déjà réclamé ce mois ?
  IF EXISTS (
    SELECT 1 FROM public.monthly_credit_grants
    WHERE user_id = v_user_id AND month_key = v_month_key
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  -- Récupérer le grade premium actif côté abonnement, pas le cache users.grade.
  SELECT ps.grade INTO v_grade
  FROM public.premium_subscriptions ps
  WHERE ps.user_id = v_user_id
    AND ps.is_active = TRUE
    AND (ps.expires_at IS NULL OR ps.expires_at > NOW())
  ORDER BY CASE ps.grade WHEN 'legend' THEN 3 WHEN 'elite' THEN 2 WHEN 'star' THEN 1 ELSE 0 END DESC,
           ps.starts_at DESC
  LIMIT 1;

  IF v_grade IS NULL OR NOT (credit_map ? v_grade) THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_grade');
  END IF;

  v_credits := (credit_map ->> v_grade)::INTEGER;

  -- Enregistrer l'allocation AVANT de créditer (protection contre double-claim)
  INSERT INTO public.monthly_credit_grants(user_id, month_key, grade, credits)
  VALUES (v_user_id, v_month_key, v_grade, v_credits);

  -- Créditer
  v_new_balance := public.grant_credits_to_user(
    v_user_id, v_credits, 'monthly_grant',
    format('Crédits mensuels %s — %s', upper(v_grade), v_month_key)
  );

  RETURN jsonb_build_object(
    'success', true,
    'credits', v_credits,
    'grade', v_grade,
    'new_balance', v_new_balance
  );
END;
$$;


--
-- Name: claim_random_duel_bot(character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_random_duel_bot(p_mode character varying DEFAULT 'no_coin'::character varying, p_wager_credits integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN public.claim_random_duel_bot(p_mode, p_wager_credits, 1);
END;
$$;


--
-- Name: claim_random_duel_bot(character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_random_duel_bot(p_mode character varying DEFAULT 'no_coin'::character varying, p_wager_credits integer DEFAULT 0, p_series_wins integer DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_queue public.duel_random_queue%ROWTYPE;
  v_matcher public.duel_random_queue%ROWTYPE;
  v_wager INTEGER := 0;
  v_series_wins INTEGER := public.duel_clean_series_wins(p_series_wins);
  v_series_max INTEGER := public.duel_series_max_rounds(p_series_wins);
  v_match_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_wait_seconds INTEGER := 0;
  v_bot JSONB;
  v_bot_score NUMERIC;
  v_bot_bucket TEXT;
  v_bot_pseudo TEXT;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF public.is_banned() THEN RETURN jsonb_build_object('success', false, 'error', 'banned'); END IF;
  IF COALESCE(p_mode, 'no_coin') <> 'no_coin' THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_mode'); END IF;

  PERFORM public.expire_old_duels();
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  SELECT * INTO v_queue FROM public.duel_random_queue WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'claimed', false, 'reason', 'not_queued');
  END IF;

  v_wager := COALESCE(v_queue.wager_tokens, v_queue.wager_credits, 0);
  v_series_wins := public.duel_clean_series_wins(v_queue.series_wins_required);
  v_series_max := public.duel_series_max_rounds(v_series_wins);
  PERFORM pg_advisory_xact_lock(hashtext('volt_random_duel_tokens_' || v_wager::text || ':bo' || v_series_wins::text));

  v_wait_seconds := GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((v_queue.created_at + INTERVAL '60 seconds') - v_now)))::INTEGER);
  IF v_wait_seconds > 0 THEN
    RETURN jsonb_build_object('success', true, 'status', 'queued', 'claimed', false, 'reason', 'too_early', 'seconds_remaining', v_wait_seconds, 'random_queue', jsonb_build_object('mode', v_queue.mode, 'wager_tokens', v_wager, 'wager_credits', v_wager, 'series_wins_required', v_series_wins, 'series_max_rounds', v_series_max, 'created_at', v_queue.created_at, 'bot_seconds_remaining', v_wait_seconds, 'bot_claim_at', v_queue.created_at + INTERVAL '60 seconds'));
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.duel_matches
    WHERE status IN ('pending', 'active')
      AND (challenger_uid = v_user_id OR opponent_uid = v_user_id)
  ) THEN
    DELETE FROM public.duel_random_queue WHERE user_id = v_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'open_duel_exists');
  END IF;

  SELECT q.* INTO v_matcher
  FROM public.duel_random_queue q
  JOIN public.users u ON u.id = q.user_id
  WHERE q.user_id <> v_user_id
    AND q.mode = 'no_coin'
    AND COALESCE(q.wager_tokens, q.wager_credits, 0) = v_wager
    AND public.duel_clean_series_wins(q.series_wins_required) = v_series_wins
    AND COALESCE(u.is_banned, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM public.duel_matches d
      WHERE d.status IN ('pending', 'active')
        AND (d.challenger_uid = q.user_id OR d.opponent_uid = q.user_id)
    )
  ORDER BY q.created_at ASC
  LIMIT 1
  FOR UPDATE OF q SKIP LOCKED;

  IF v_matcher.user_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_matcher.user_id::text));
    DELETE FROM public.duel_random_queue WHERE user_id IN (v_user_id, v_matcher.user_id);

    INSERT INTO public.duel_matches(
      challenger_uid, opponent_uid, mode, status, accepted_at, started_at, ends_at,
      wager_credits, wager_tokens, challenger_escrow, opponent_escrow, challenger_token_escrow, opponent_token_escrow,
      is_bot_match, series_wins_required, series_max_rounds, current_round
    ) VALUES (
      v_matcher.user_id, v_user_id, 'no_coin', 'active', v_now, v_now, v_now + INTERVAL '13 hours',
      v_wager, v_wager, 0, 0, v_wager, v_wager,
      FALSE, v_series_wins, v_series_max, 1
    ) RETURNING id INTO v_match_id;

    INSERT INTO public.duel_run_states(match_id, user_id, state, elapsed_ms, run_started_at, last_seen_at, updated_at)
    VALUES
      (v_match_id, v_matcher.user_id, 'idle', 0, NULL, v_now, v_now),
      (v_match_id, v_user_id, 'idle', 0, NULL, v_now, v_now)
    ON CONFLICT (match_id, user_id) DO NOTHING;

    UPDATE public.volt_token_transactions
    SET ref_id = v_match_id
    WHERE ref_id IS NULL AND type = 'duel_escrow' AND user_id IN (v_user_id, v_matcher.user_id) AND created_at > v_now - INTERVAL '10 minutes';

    RETURN jsonb_build_object('success', true, 'status', 'active', 'match_id', v_match_id, 'wager_tokens', v_wager, 'wager_credits', v_wager, 'matched_real_player', true, 'live_ready', true, 'series_wins_required', v_series_wins, 'series_max_rounds', v_series_max, 'current_round', 1);
  END IF;

  v_bot := public.generate_duel_bot_score_for_user(v_user_id);
  v_bot_score := (v_bot->>'score')::numeric;
  v_bot_bucket := v_bot->>'bucket';
  v_bot_pseudo := (ARRAY['Nexo','Kaori','Riven','Aksel','Milo','Sora','Kairo','Nyx','Zayn','Eden','Luna','Orion','Rafa','Ilyas','Noa','Tao'])[1 + FLOOR(random() * 16)::INTEGER];

  DELETE FROM public.duel_random_queue WHERE user_id = v_user_id;

  INSERT INTO public.duel_matches(
    challenger_uid, opponent_uid, mode, status, accepted_at, started_at, ends_at,
    wager_credits, wager_tokens, challenger_escrow, opponent_escrow, challenger_token_escrow, opponent_token_escrow,
    is_bot_match, bot_score, bot_pseudo, bot_generated_at, bot_distribution_bucket,
    series_wins_required, series_max_rounds, current_round
  ) VALUES (
    v_user_id, NULL, 'no_coin', 'active', v_now, v_now, v_now + INTERVAL '13 hours',
    v_wager, v_wager, 0, 0, v_wager, 0,
    TRUE, v_bot_score, v_bot_pseudo, v_now, v_bot_bucket,
    v_series_wins, v_series_max, 1
  ) RETURNING id INTO v_match_id;

  INSERT INTO public.duel_run_states(match_id, user_id, state, elapsed_ms, run_started_at, last_seen_at, updated_at)
  VALUES (v_match_id, v_user_id, 'idle', 0, NULL, v_now, v_now)
  ON CONFLICT (match_id, user_id) DO NOTHING;

  UPDATE public.volt_token_transactions
  SET ref_id = v_match_id
  WHERE ref_id IS NULL AND type = 'duel_escrow' AND user_id = v_user_id AND created_at > v_now - INTERVAL '10 minutes';

  RETURN jsonb_build_object('success', true, 'status', 'bot_active', 'claimed', true, 'is_bot_match', true, 'match_id', v_match_id, 'bot_score', v_bot_score, 'bot_pseudo', v_bot_pseudo, 'bot_distribution_bucket', v_bot_bucket, 'bot_source', v_bot->>'source', 'bot_player_average', v_bot->'player_average', 'wager_tokens', v_wager, 'wager_credits', v_wager, 'tie_rule', 'exact_equal_time_draw', 'live_ready', true, 'series_wins_required', v_series_wins, 'series_max_rounds', v_series_max, 'current_round', 1);
END;
$$;


--
-- Name: claim_season_pass_node(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_season_pass_node(p_node_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user     UUID := auth.uid();
  v_node     RECORD;
  v_xp       INT;
  v_progress RECORD;
BEGIN
  SELECT * INTO v_node FROM season_pass_nodes WHERE id = p_node_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'node_not_found'; END IF;
  SELECT xp INTO v_xp FROM users WHERE id = v_user;
  IF COALESCE(v_xp, 0) < v_node.xp_required THEN RAISE EXCEPTION 'insufficient_xp'; END IF;
  SELECT * INTO v_progress FROM user_season_pass_progress
    WHERE user_id = v_user AND season_id = v_node.season_id;
  IF v_node.is_premium_only AND (v_progress IS NULL OR NOT v_progress.is_premium) THEN
    RAISE EXCEPTION 'premium_required';
  END IF;
  IF v_progress IS NOT NULL AND p_node_id = ANY(v_progress.claimed_nodes) THEN
    RAISE EXCEPTION 'already_claimed';
  END IF;
  INSERT INTO user_season_pass_progress(user_id, season_id, claimed_nodes)
    VALUES (v_user, v_node.season_id, ARRAY[p_node_id])
    ON CONFLICT(user_id, season_id) DO UPDATE
      SET claimed_nodes = user_season_pass_progress.claimed_nodes || p_node_id
    WHERE NOT (p_node_id = ANY(user_season_pass_progress.claimed_nodes));
  IF v_node.reward_type = 'credits' THEN
    UPDATE users SET credits = COALESCE(credits, 0) + (v_node.reward_value->>'amount')::INT WHERE id = v_user;
  ELSIF v_node.reward_type = 'title' THEN
    INSERT INTO user_titles(user_id, title_key, unlocked_at)
      VALUES (v_user, v_node.reward_value->>'title_key', now())
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success', true, 'reward', v_node.reward_value);
END;
$$;


--
-- Name: cleanup_expired_friend_requests(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_friend_requests() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_count int;
BEGIN
  WITH deleted AS (
    DELETE FROM friend_requests
     WHERE status = 'pending'
       AND expires_at IS NOT NULL
       AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted;
  RETURN v_count;
END $$;


--
-- Name: cleanup_expired_score_nonces(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_score_nonces() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_n integer;
BEGIN
  DELETE FROM public.score_nonces WHERE expires_at < NOW() - INTERVAL '1 day';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN COALESCE(v_n, 0);
END $$;


--
-- Name: cleanup_stale_duel_run_states(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_stale_duel_run_states() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_n integer;
BEGIN
  WITH d AS (
    UPDATE public.duel_run_states rs
       SET state = 'finished',
           last_seen_at = NOW(),
           updated_at = NOW()
      FROM public.duel_matches m
     WHERE m.id = rs.match_id
       AND m.status IN ('completed', 'cancelled', 'expired', 'voided')
       AND rs.state IN ('idle', 'running')
    RETURNING 1
  ) SELECT COUNT(*) INTO v_n FROM d;
  RETURN COALESCE(v_n, 0);
END $$;


--
-- Name: create_duel(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_duel(p_target_uid uuid, p_mode character varying DEFAULT 'no_coin'::character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN public.create_duel(p_target_uid, p_mode, 0, 1);
END;
$$;


--
-- Name: create_duel(uuid, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_duel(p_target_uid uuid, p_mode character varying DEFAULT 'no_coin'::character varying, p_wager_credits integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN public.create_duel(p_target_uid, p_mode, p_wager_credits, 1);
END;
$$;


--
-- Name: create_duel(uuid, character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_duel(p_target_uid uuid, p_mode character varying DEFAULT 'no_coin'::character varying, p_wager_credits integer DEFAULT 0, p_series_wins integer DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wager INTEGER := LEAST(10000, GREATEST(0, COALESCE(p_wager_credits, 0)));
  v_series_wins INTEGER := public.duel_clean_series_wins(p_series_wins);
  v_series_max INTEGER := public.duel_series_max_rounds(p_series_wins);
  v_match_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF public.is_banned() THEN RETURN jsonb_build_object('success', false, 'error', 'banned'); END IF;
  IF COALESCE(p_mode, 'no_coin') <> 'no_coin' THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_mode'); END IF;
  IF p_target_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'target_not_found'); END IF;
  IF p_target_uid = v_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'cannot_duel_self'); END IF;

  PERFORM public.expire_old_duels();

  IF v_user_id::text < p_target_uid::text THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));
    PERFORM pg_advisory_xact_lock(hashtext(p_target_uid::text));
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext(p_target_uid::text));
    PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_target_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_not_found');
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE id = p_target_uid AND COALESCE(is_banned, false) = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_unavailable');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.duel_matches
    WHERE status IN ('pending','active')
      AND (challenger_uid IN (v_user_id, p_target_uid) OR opponent_uid IN (v_user_id, p_target_uid))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'open_duel_exists');
  END IF;

  PERFORM public.ensure_token_balance(v_user_id, v_wager);

  INSERT INTO public.duel_matches(
    challenger_uid, opponent_uid, mode, wager_credits, wager_tokens,
    challenger_escrow, opponent_escrow, challenger_token_escrow, opponent_token_escrow,
    series_wins_required, series_max_rounds, current_round
  )
  VALUES (
    v_user_id, p_target_uid, 'no_coin', v_wager, v_wager,
    0, 0, v_wager, 0,
    v_series_wins, v_series_max, 1
  )
  RETURNING id INTO v_match_id;

  IF v_wager > 0 THEN
    PERFORM public.apply_token_delta(v_user_id, -v_wager, 'duel_escrow', 'Mise 1v1 tokens', v_match_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'match_id', v_match_id, 'wager_tokens', v_wager, 'wager_credits', v_wager, 'series_wins_required', v_series_wins, 'series_max_rounds', v_series_max, 'current_round', 1);
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'insufficient_tokens' THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_tokens');
  END IF;
  RAISE;
END;
$$;


--
-- Name: create_duel_by_pseudo(character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_duel_by_pseudo(p_target_pseudo character varying, p_mode character varying DEFAULT 'no_coin'::character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN public.create_duel_by_pseudo(p_target_pseudo, p_mode, 0, 1);
END;
$$;


--
-- Name: create_duel_by_pseudo(character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_duel_by_pseudo(p_target_pseudo character varying, p_mode character varying DEFAULT 'no_coin'::character varying, p_wager_credits integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN public.create_duel_by_pseudo(p_target_pseudo, p_mode, p_wager_credits, 1);
END;
$$;


--
-- Name: create_duel_by_pseudo(character varying, character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_duel_by_pseudo(p_target_pseudo character varying, p_mode character varying DEFAULT 'no_coin'::character varying, p_wager_credits integer DEFAULT 0, p_series_wins integer DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_target_uid UUID;
BEGIN
  SELECT id INTO v_target_uid
  FROM public.users
  WHERE lower(COALESCE(pseudo, '')) = lower(trim(COALESCE(p_target_pseudo, '')))
     OR lower(COALESCE(username, '')) = lower(trim(COALESCE(p_target_pseudo, '')))
  LIMIT 1;

  IF v_target_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_not_found');
  END IF;

  RETURN public.create_duel(v_target_uid, p_mode, p_wager_credits, p_series_wins);
END;
$$;


--
-- Name: create_payment_order(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_payment_order(p_product_type text, p_product_id text, p_provider text DEFAULT 'stripe'::text, p_success_url text DEFAULT NULL::text, p_cancel_url text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_product JSONB;
  v_order public.payment_orders%ROWTYPE;
  v_provider TEXT := lower(trim(COALESCE(p_provider, 'stripe')));
  v_key TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF public.is_banned() THEN
    RETURN jsonb_build_object('success', false, 'error', 'banned');
  END IF;
  IF v_provider NOT IN ('stripe','paypal','manual') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_provider');
  END IF;

  v_product := public.volt_payment_product(p_product_type, p_product_id);
  v_key := encode(digest(v_user_id::TEXT || ':' || (v_product->>'product_type') || ':' || (v_product->>'product_id') || ':' || date_trunc('minute', NOW())::TEXT, 'sha256'), 'hex');

  INSERT INTO public.payment_orders(user_id, provider, product_type, product_id, amount_cents, currency, tokens, grade, status, metadata, idempotency_key)
  VALUES (
    v_user_id,
    v_provider,
    v_product->>'product_type',
    v_product->>'product_id',
    (v_product->>'amount_cents')::INTEGER,
    COALESCE(v_product->>'currency', 'eur'),
    COALESCE((v_product->>'tokens')::INTEGER, 0),
    NULLIF(v_product->>'grade', ''),
    'pending',
    jsonb_build_object('product', v_product, 'success_url', p_success_url, 'cancel_url', p_cancel_url),
    v_key
  )
  ON CONFLICT (idempotency_key) DO UPDATE
    SET updated_at = NOW()
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'status', v_order.status,
    'provider', v_order.provider,
    'product', v_product,
    'checkout_url', v_order.checkout_url
  );
END;
$$;


--
-- Name: create_team(character varying, character varying, text, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_team(p_name character varying, p_tag character varying, p_description text DEFAULT NULL::text, p_icon text DEFAULT 'fa-solid fa-bolt'::text, p_is_public boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF public.is_banned() THEN RAISE EXCEPTION 'account_banned'; END IF;
 
  IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'already_in_team';
  END IF;
 
  IF char_length(trim(p_name)) < 3 THEN RAISE EXCEPTION 'name_too_short'; END IF;
  IF char_length(trim(p_tag))  < 2 THEN RAISE EXCEPTION 'tag_too_short';  END IF;
 
  INSERT INTO public.teams(name, tag, description, icon, owner_id, max_members, is_public)
  VALUES (trim(p_name), upper(trim(p_tag)), p_description, COALESCE(p_icon,'fa-solid fa-bolt'), v_user_id, 5, p_is_public)
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members(team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'owner');

  RETURN jsonb_build_object('success', true, 'team_id', v_team_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'name_or_tag_taken');
END;
$$;


--
-- Name: create_team(character varying, character varying, text, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_team(p_name character varying, p_tag character varying, p_description text DEFAULT NULL::text, p_icon_emoji character varying DEFAULT '⚡'::character varying, p_is_public boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF public.is_banned() THEN RAISE EXCEPTION 'account_banned'; END IF;

  IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'already_in_team';
  END IF;

  IF char_length(trim(p_name)) < 3 THEN RAISE EXCEPTION 'name_too_short'; END IF;
  IF char_length(trim(p_tag))  < 2 THEN RAISE EXCEPTION 'tag_too_short';  END IF;

  INSERT INTO public.teams(name, tag, description, icon_emoji, owner_id, max_members, is_public)
  VALUES (trim(p_name), upper(trim(p_tag)), p_description, COALESCE(p_icon_emoji,'⚡'), v_user_id, 5, p_is_public)
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members(team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'owner');

  RETURN jsonb_build_object('success', true, 'team_id', v_team_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'name_or_tag_taken');
END;
$$;


--
-- Name: decline_team_invite(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decline_team_invite(p_invite_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  UPDATE public.team_invites
  SET status = 'declined'
  WHERE id = p_invite_id
    AND to_uid = v_user_id
    AND status = 'pending'
  RETURNING team_id INTO v_team_id;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invite_not_found');
  END IF;

  RETURN jsonb_build_object('success', true, 'team_id', v_team_id);
END;
$$;


--
-- Name: delete_my_account(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_my_account(p_confirm text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hwid text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_confirm IS NULL OR upper(btrim(p_confirm)) <> 'SUPPRIMER' THEN
    RETURN jsonb_build_object('success', false, 'error', 'confirmation_required');
  END IF;

  SELECT hwid INTO v_hwid FROM users WHERE id = v_uid;

  -- Audit before deleting (admin trail kept via ON DELETE SET NULL on audit logs).
  PERFORM admin_log_action(
    v_uid, v_uid, 'user', v_uid::text,
    'self_account_deletion', 'gdpr_user_request', NULL,
    jsonb_build_object('hwid', v_hwid),
    '{}'::jsonb
  );

  -- CASCADE FKs handle most child rows (duel_*, scores, run_history,
  -- friends, friend_requests, team_members, direct_messages, etc.).
  DELETE FROM users WHERE id = v_uid;

  RETURN jsonb_build_object('success', true);
END $$;


--
-- Name: delete_reverse_friendship(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_reverse_friendship() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Empêche le trigger de s'appeler lui-même à l'infini
  IF pg_trigger_depth() > 1 THEN 
    RETURN OLD; 
  END IF;

  DELETE FROM public.friends
    WHERE user_id = OLD.friend_id AND friend_id = OLD.user_id;
  RETURN OLD;
END;
$$;


--
-- Name: digest(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.digest(data text, type text) RETURNS bytea
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    AS $$
  select extensions.digest(data::bytea, type);
$$;


--
-- Name: do_weekly_spin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.do_weekly_spin(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
DECLARE
  v_last_spin TIMESTAMPTZ;
  v_item public.spin_wheel_items%ROWTYPE;
  v_total_weight INTEGER;
  v_rand INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT spun_at INTO v_last_spin
  FROM public.user_spin_history
  WHERE user_id = p_user_id
  ORDER BY spun_at DESC
  LIMIT 1;

  IF v_last_spin IS NOT NULL AND v_last_spin > NOW() - INTERVAL '7 days' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'cooldown',
      'next_spin_at', (v_last_spin + INTERVAL '7 days')
    );
  END IF;

  SELECT SUM(weight) INTO v_total_weight FROM public.spin_wheel_items;
  IF COALESCE(v_total_weight, 0) <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'spin_items_empty');
  END IF;

  v_rand := floor(random() * v_total_weight)::INTEGER;

  SELECT * INTO v_item
  FROM public.spin_wheel_items
  WHERE (
    SELECT SUM(s2.weight)
    FROM public.spin_wheel_items s2
    WHERE s2.id <= spin_wheel_items.id
  ) > v_rand
  ORDER BY id
  LIMIT 1;

  IF v_item.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'spin_item_not_found');
  END IF;

  INSERT INTO public.user_spin_history (user_id, item_id) VALUES (p_user_id, v_item.id);

  IF v_item.reward_type = 'credits' AND v_item.reward_value > 0 THEN
    v_new_balance := public.grant_credits_to_user(
      p_user_id,
      v_item.reward_value,
      'gift',
      'Récompense roue: ' || COALESCE(v_item.label_fr, v_item.label_en, v_item.reward_type),
      NULL
    );
    UPDATE public.users SET credits = v_new_balance WHERE id = p_user_id;
  END IF;

  IF v_item.reward_type = 'xp' AND v_item.reward_value > 0 THEN
    BEGIN
      PERFORM public.add_user_xp(p_user_id, v_item.reward_value);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END IF;

  RETURN json_build_object('success', true, 'item', row_to_json(v_item));
END;
$$;


--
-- Name: duel_clean_series_wins(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.duel_clean_series_wins(p_series_wins integer DEFAULT 1) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE WHEN COALESCE(p_series_wins, 1) IN (1, 2, 3) THEN COALESCE(p_series_wins, 1) ELSE 1 END;
$$;


--
-- Name: duel_elo_band(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.duel_elo_band(p_wait_seconds integer) RETURNS integer
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT GREATEST(100, 100 + p_wait_seconds * 5)::integer;
$$;


--
-- Name: duel_live_score_seconds(integer, timestamp with time zone, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.duel_live_score_seconds(p_elapsed_ms integer, p_run_started_at timestamp with time zone, p_last_seen_at timestamp with time zone, p_now timestamp with time zone DEFAULT now()) RETURNS numeric
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_elapsed NUMERIC := GREATEST(0, COALESCE(p_elapsed_ms, 0)) / 1000.0;
  v_clock NUMERIC := 0;
BEGIN
  IF p_run_started_at IS NOT NULL THEN
    v_clock := GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(p_last_seen_at, p_now) - p_run_started_at)));
  END IF;
  RETURN LEAST(43200, GREATEST(v_elapsed, v_clock));
END;
$$;


--
-- Name: duel_respond_caller_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.duel_respond_caller_lock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Acquire transactional advisory lock for the caller side (opponent_uid
  -- in the transition pending→active). Prevents two parallel respond_duel
  -- calls from the same user from both passing the open_duel_exists check.
  IF NEW.status = 'active' AND COALESCE(OLD.status, '') = 'pending' THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.opponent_uid::text));
  END IF;
  RETURN NEW;
END $$;


--
-- Name: duel_series_max_rounds(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.duel_series_max_rounds(p_series_wins integer DEFAULT 1) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT (public.duel_clean_series_wins(p_series_wins) * 2) - 1;
$$;


--
-- Name: enforce_active_category_bans(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_active_category_bans() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user UUID;
BEGIN
  -- Admin RPCs may moderate/repair data for banned users. Regular clients cannot.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'global_chat' THEN
    v_user := NEW.uid;
    IF public.has_active_ban(v_user, 'chat') THEN RAISE EXCEPTION 'chat_banned'; END IF;
  ELSIF TG_TABLE_NAME = 'direct_messages' THEN
    v_user := NEW.from_uid;
    IF public.has_active_ban(v_user, 'chat') THEN RAISE EXCEPTION 'chat_banned'; END IF;
  ELSIF TG_TABLE_NAME = 'team_chat' THEN
    v_user := NEW.uid;
    IF public.has_active_ban(v_user, 'chat') OR public.has_active_ban(v_user, 'clans') THEN RAISE EXCEPTION 'team_chat_banned'; END IF;
  ELSIF TG_TABLE_NAME = 'teams' THEN
    v_user := NEW.owner_id;
    IF public.has_active_ban(v_user, 'clans') THEN RAISE EXCEPTION 'clans_banned'; END IF;
  ELSIF TG_TABLE_NAME = 'team_members' THEN
    v_user := NEW.user_id;
    IF public.has_active_ban(v_user, 'clans') THEN RAISE EXCEPTION 'clans_banned'; END IF;
  ELSIF TG_TABLE_NAME = 'scores' THEN
    v_user := NEW.user_id;
    IF public.has_active_ban(v_user, 'runs') OR public.has_active_ban(v_user, 'leaderboard') THEN RAISE EXCEPTION 'runs_banned'; END IF;
  ELSIF TG_TABLE_NAME = 'run_history' THEN
    v_user := NEW.user_id;
    IF public.has_active_ban(v_user, 'runs') OR public.has_active_ban(v_user, 'leaderboard') THEN RAISE EXCEPTION 'runs_banned'; END IF;
  ELSIF TG_TABLE_NAME = 'duel_matches' THEN
    IF COALESCE(NEW.status, 'pending') IN ('pending','active') AND
       (public.has_active_ban(NEW.challenger_uid, 'duels') OR public.has_active_ban(NEW.opponent_uid, 'duels')) THEN
      RAISE EXCEPTION 'duels_banned';
    END IF;
  ELSIF TG_TABLE_NAME = 'duel_match_results' THEN
    v_user := NEW.user_id;
    IF public.has_active_ban(v_user, 'duels') THEN RAISE EXCEPTION 'duels_banned'; END IF;
  ELSIF TG_TABLE_NAME = 'duel_run_states' THEN
    v_user := NEW.user_id;
    IF public.has_active_ban(v_user, 'duels') THEN RAISE EXCEPTION 'duels_banned'; END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: enforce_bot_wager_zero(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_bot_wager_zero() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.is_bot_match AND COALESCE(NEW.wager_tokens, 0) > 0 THEN
    NEW.wager_tokens := 0;
    NEW.challenger_token_escrow := 0;
    NEW.opponent_token_escrow := 0;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: enforce_dm_rate_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_dm_rate_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_last timestamptz;
  v_grade text;
  v_min_ms int;
  v_now timestamptz := COALESCE(NEW.sent_at, now());
BEGIN
  IF is_admin() THEN RETURN NEW; END IF;

  SELECT lower(COALESCE(grade, '')) INTO v_grade
    FROM users WHERE id = NEW.from_uid;

  v_min_ms := CASE v_grade
                WHEN 'legend' THEN 200
                WHEN 'elite'  THEN 400
                WHEN 'star'   THEN 700
                ELSE 1500
              END;

  SELECT MAX(sent_at) INTO v_last
    FROM direct_messages
    WHERE from_uid = NEW.from_uid
      AND to_uid   = NEW.to_uid;

  IF v_last IS NOT NULL
     AND EXTRACT(EPOCH FROM (v_now - v_last)) * 1000 < v_min_ms THEN
    RAISE EXCEPTION 'dm_rate_limited' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END $$;


--
-- Name: enforce_duel_block_pair(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_duel_block_pair() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.challenger_uid IS NULL OR NEW.opponent_uid IS NULL THEN RETURN NEW; END IF;
  IF is_admin() THEN RETURN NEW; END IF;
  IF is_blocked_pair(NEW.challenger_uid, NEW.opponent_uid, 'duels') THEN
    RAISE EXCEPTION 'duel_blocked_pair' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: enforce_duel_invite_rate_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_duel_invite_rate_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_count int;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  IF is_admin() THEN RETURN NEW; END IF;
  IF NEW.challenger_uid IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_count
    FROM duel_matches
   WHERE challenger_uid = NEW.challenger_uid
     AND status = 'pending'
     AND created_at > now() - interval '60 seconds';

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'too_many_pending_invites' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END $$;


--
-- Name: enforce_duel_pair_cooldown(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_duel_pair_cooldown() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_n integer;
  v_cap constant integer := 5;
BEGIN
  IF NEW.opponent_uid IS NULL OR NEW.is_bot_match THEN RETURN NEW; END IF;
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  IF public.is_admin() THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_n FROM public.duel_matches dm
    WHERE dm.created_at > NOW() - INTERVAL '24 hours'
      AND dm.status IN ('completed', 'active', 'pending')
      AND ((dm.challenger_uid = NEW.challenger_uid AND dm.opponent_uid = NEW.opponent_uid)
        OR (dm.opponent_uid   = NEW.challenger_uid AND dm.challenger_uid = NEW.opponent_uid));
  IF v_n >= v_cap THEN
    RAISE EXCEPTION 'same_pair_cooldown' USING ERRCODE = 'P0001',
      DETAIL = format('limit %s/24h between this pair', v_cap);
  END IF;
  RETURN NEW;
END $$;


--
-- Name: enforce_email_from_auth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_email_from_auth() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.email := COALESCE(
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      NEW.email
    );
  END IF;
  RETURN NEW;
END $$;


--
-- Name: enforce_friend_request_rate_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_friend_request_rate_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_min int; v_day int;
BEGIN
  IF NEW.from_uid IS NULL OR public.is_admin() THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_min FROM public.friend_requests
    WHERE from_uid = NEW.from_uid
      AND created_at > NOW() - INTERVAL '60 seconds';
  IF v_min >= 3 THEN
    RAISE EXCEPTION 'too_many_friend_requests' USING ERRCODE = 'P0001';
  END IF;
  SELECT COUNT(*) INTO v_day FROM public.friend_requests
    WHERE from_uid = NEW.from_uid
      AND created_at > NOW() - INTERVAL '24 hours';
  IF v_day >= 50 THEN
    RAISE EXCEPTION 'daily_friend_request_quota_reached' USING ERRCODE = 'P0001';
  END IF;
  -- Pair-specific cooldown: 1 per (from, to) per 5 minutes
  IF NEW.receiver_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.friend_requests
               WHERE from_uid = NEW.from_uid
                 AND receiver_id = NEW.receiver_id
                 AND created_at > NOW() - INTERVAL '5 minutes') THEN
      RAISE EXCEPTION 'friend_request_pair_cooldown' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: enforce_global_chat_slowmode(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_global_chat_slowmode() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  last_msg_time TIMESTAMPTZ;
  is_bypass BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur est Admin ou a un grade Elite/Legend actif (qui ignorent le slowmode)
  SELECT (
    public.is_admin() OR 
    EXISTS(SELECT 1 FROM public.active_premium WHERE user_id = NEW.uid AND grade IN ('elite', 'legend'))
  ) INTO is_bypass;

  IF NOT is_bypass THEN
    SELECT created_at INTO last_msg_time FROM public.global_chat 
    WHERE uid = NEW.uid ORDER BY created_at DESC LIMIT 1;

    -- Imposer le cooldown de 5 secondes (FREE_SLOWMODE)
    IF last_msg_time IS NOT NULL AND (NOW() - last_msg_time) < INTERVAL '5 seconds' THEN
      RAISE EXCEPTION 'Slowmode actif (5s). Veuillez patienter ou passer Premium pour le retirer !';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: enforce_score_category_bounds(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_score_category_bounds() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_min numeric;
  v_max numeric;
BEGIN
  IF NEW.category IS NULL OR NEW.time IS NULL THEN RETURN NEW; END IF;
  IF is_admin() THEN RETURN NEW; END IF;

  SELECT min_seconds, max_seconds INTO v_min, v_max
    FROM category_bounds
   WHERE category = NEW.category;

  IF v_min IS NOT NULL AND NEW.time < v_min THEN
    RAISE EXCEPTION 'score_below_floor' USING ERRCODE = 'P0001';
  END IF;
  IF v_max IS NOT NULL AND NEW.time > v_max THEN
    RAISE EXCEPTION 'score_above_ceiling' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END $$;


--
-- Name: enforce_team_member_max(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_team_member_max() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_count int;
  v_max int;
BEGIN
  SELECT max_members INTO v_max FROM teams WHERE id = NEW.team_id;
  IF v_max IS NULL THEN v_max := 5; END IF;

  -- Lock the team row to serialize concurrent inserts.
  PERFORM 1 FROM teams WHERE id = NEW.team_id FOR UPDATE;

  SELECT COUNT(*) INTO v_count FROM team_members
    WHERE team_id = NEW.team_id;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'team_full' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END $$;


--
-- Name: ensure_credit_balance(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_credit_balance(p_user_id uuid, p_amount integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF COALESCE(p_amount, 0) <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.volt_credits(user_id, balance, total_earned)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance
  FROM public.volt_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF COALESCE(v_balance, 0) < p_amount THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: player_elo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_elo (
    user_id uuid NOT NULL,
    global_elo integer DEFAULT 1000 NOT NULL,
    duel_elo integer DEFAULT 1000 NOT NULL,
    duels_played integer DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    draws integer DEFAULT 0 NOT NULL,
    current_win_streak integer DEFAULT 0 NOT NULL,
    best_win_streak integer DEFAULT 0 NOT NULL,
    tokens_won_from_duels integer DEFAULT 0 NOT NULL,
    tokens_lost_from_duels integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT player_elo_best_win_streak_check CHECK ((best_win_streak >= 0)),
    CONSTRAINT player_elo_current_win_streak_check CHECK ((current_win_streak >= 0)),
    CONSTRAINT player_elo_draws_check CHECK ((draws >= 0)),
    CONSTRAINT player_elo_duel_elo_check CHECK ((duel_elo >= 0)),
    CONSTRAINT player_elo_duels_played_check CHECK ((duels_played >= 0)),
    CONSTRAINT player_elo_global_elo_check CHECK ((global_elo >= 0)),
    CONSTRAINT player_elo_losses_check CHECK ((losses >= 0)),
    CONSTRAINT player_elo_tokens_lost_from_duels_check CHECK ((tokens_lost_from_duels >= 0)),
    CONSTRAINT player_elo_tokens_won_from_duels_check CHECK ((tokens_won_from_duels >= 0)),
    CONSTRAINT player_elo_wins_check CHECK ((wins >= 0))
);


--
-- Name: ensure_player_elo(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_player_elo(p_user_id uuid) RETURNS public.player_elo
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_row public.player_elo%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  INSERT INTO public.player_elo(user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM public.player_elo WHERE user_id = p_user_id;

  UPDATE public.users
  SET global_elo = v_row.global_elo,
      duel_elo = v_row.duel_elo,
      duel_total_played = v_row.duels_played,
      duel_wins = v_row.wins,
      duel_losses = v_row.losses,
      duel_draws = v_row.draws,
      duel_current_win_streak = v_row.current_win_streak,
      duel_best_win_streak = v_row.best_win_streak,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN v_row;
END;
$$;


--
-- Name: ensure_token_balance(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_token_balance(p_user_id uuid, p_amount integer DEFAULT 0) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF COALESCE(p_amount, 0) <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.volt_tokens(user_id, balance, total_granted)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance
  FROM public.volt_tokens
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF COALESCE(v_balance, 0) < p_amount THEN
    RAISE EXCEPTION 'insufficient_tokens';
  END IF;
END;
$$;


--
-- Name: expire_duel_invites(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_duel_invites() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.duel_invites
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;


--
-- Name: expire_old_duels(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_old_duels() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  r RECORD;
  v_ch_score NUMERIC;
  v_op_score NUMERIC;
  v_winner UUID;
  v_winner_side VARCHAR(20);
BEGIN
  PERFORM public.finalize_duel_from_live_states(NULL);

  FOR r IN
    SELECT id FROM public.duel_matches WHERE status = 'pending' AND expires_at < NOW() FOR UPDATE
  LOOP
    PERFORM public.refund_duel_escrow(r.id);
    UPDATE public.duel_matches SET status = 'expired', completed_at = NOW() WHERE id = r.id;
  END LOOP;

  FOR r IN
    SELECT * FROM public.duel_random_queue WHERE created_at < NOW() - INTERVAL '5 minutes' FOR UPDATE
  LOOP
    DELETE FROM public.duel_random_queue WHERE user_id = r.user_id;
    IF COALESCE(r.wager_tokens, r.wager_credits, 0) > 0 THEN
      PERFORM public.apply_token_delta(r.user_id, COALESCE(r.wager_tokens, r.wager_credits, 0), 'duel_refund', 'Expiration recherche 1v1 random', NULL);
    END IF;
  END LOOP;

  FOR r IN
    SELECT d.*
    FROM public.duel_matches d
    LEFT JOIN public.duel_match_results cr ON cr.match_id = d.id AND cr.user_id = d.challenger_uid
    LEFT JOIN public.duel_match_results orr ON orr.match_id = d.id AND orr.user_id = d.opponent_uid
    WHERE d.status = 'active'
      AND d.ends_at IS NOT NULL
      AND d.ends_at < NOW()
      AND (cr.user_id IS NOT NULL OR orr.user_id IS NOT NULL OR d.is_bot_match = TRUE)
    FOR UPDATE OF d
  LOOP
    SELECT score INTO v_ch_score FROM public.duel_match_results WHERE match_id = r.id AND user_id = r.challenger_uid;
    IF COALESCE(r.is_bot_match, FALSE) THEN
      IF r.bot_score IS NOT NULL AND NOW() >= (COALESCE(r.started_at, r.accepted_at, r.bot_generated_at, r.created_at) + (GREATEST(1, r.bot_score)::TEXT || ' seconds')::INTERVAL) THEN
        v_op_score := r.bot_score;
      ELSE
        v_op_score := NULL;
      END IF;
    ELSE
      SELECT score INTO v_op_score FROM public.duel_match_results WHERE match_id = r.id AND user_id = r.opponent_uid;
    END IF;

    v_winner := NULL;
    v_winner_side := NULL;
    IF v_ch_score IS NOT NULL AND v_op_score IS NULL THEN
      v_winner := r.challenger_uid;
      v_winner_side := 'challenger';
    ELSIF v_op_score IS NOT NULL AND v_ch_score IS NULL THEN
      v_winner := CASE WHEN COALESCE(r.is_bot_match, FALSE) THEN NULL ELSE r.opponent_uid END;
      v_winner_side := 'opponent';
    ELSIF v_ch_score IS NOT NULL AND v_op_score IS NOT NULL THEN
      IF v_ch_score > v_op_score THEN
        v_winner := r.challenger_uid;
        v_winner_side := 'challenger';
      ELSIF v_op_score > v_ch_score THEN
        v_winner := CASE WHEN COALESCE(r.is_bot_match, FALSE) THEN NULL ELSE r.opponent_uid END;
        v_winner_side := 'opponent';
      ELSE
        v_winner_side := 'draw';
      END IF;
    END IF;

    PERFORM public.finish_duel_payout(r.id, v_winner);

    UPDATE public.duel_matches
    SET status = 'completed', completed_at = NOW(), winner_uid = v_winner, winner_side = v_winner_side
    WHERE id = r.id AND status = 'active';
  END LOOP;
END;
$$;


--
-- Name: export_my_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.export_my_data() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_result jsonb := '{}'::jsonb;
  v_tmp    jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  v_result := v_result || jsonb_build_object(
    'export_metadata', jsonb_build_object(
      'generated_at', now(),
      'user_id', v_uid,
      'format_version', '1.1',
      'gdpr_article', '20 (Right to data portability)',
      'extension', 'Volt Extension v21.0.0'
    )
  );

  -- profile
  BEGIN SELECT to_jsonb(u.*) INTO v_tmp FROM public.users u WHERE u.id = v_uid;
    v_result := v_result || jsonb_build_object('profile', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('profile', null); END;

  -- scores
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.scores t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('scores', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('scores', null); END;

  -- run_history
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.run_history t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('run_history', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('run_history', null); END;

  -- player_elo
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.player_elo t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('player_elo', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('player_elo', null); END;

  -- elo_history
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.elo_history t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('elo_history', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('elo_history', null); END;

  -- duel_matches (CORRECTED columns)
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.duel_matches t WHERE t.challenger_uid = v_uid OR t.opponent_uid = v_uid;
    v_result := v_result || jsonb_build_object('duel_matches', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('duel_matches', null); END;

  -- duel_invites (CORRECTED — sender_id / receiver_id)
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.duel_invites t WHERE t.sender_id = v_uid OR t.receiver_id = v_uid;
    v_result := v_result || jsonb_build_object('duel_invites', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('duel_invites', null); END;

  -- direct_messages (CORRECTED — from_uid / to_uid)
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.direct_messages t WHERE t.from_uid = v_uid OR t.to_uid = v_uid;
    v_result := v_result || jsonb_build_object('direct_messages', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('direct_messages', null); END;

  -- global_chat (CORRECTED — uid)
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.global_chat t WHERE t.uid = v_uid;
    v_result := v_result || jsonb_build_object('global_chat', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('global_chat', null); END;

  -- team_chat
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.team_chat t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('team_chat', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('team_chat', null); END;

  -- friends
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.friends t WHERE t.user_id = v_uid OR t.friend_id = v_uid;
    v_result := v_result || jsonb_build_object('friends', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('friends', null); END;

  -- friend_requests (CORRECTED — from_uid / receiver_id)
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.friend_requests t WHERE t.from_uid = v_uid OR t.receiver_id = v_uid;
    v_result := v_result || jsonb_build_object('friend_requests', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('friend_requests', null); END;

  -- user_blocks
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.user_blocks t WHERE t.blocker_id = v_uid OR t.blocked_id = v_uid;
    v_result := v_result || jsonb_build_object('user_blocks', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('user_blocks', null); END;

  -- ignore_list
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.ignore_list t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('ignore_list', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('ignore_list', null); END;

  -- team_members
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.team_members t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('team_members', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('team_members', null); END;

  -- team_invites (CORRECTED — from_uid / to_uid)
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.team_invites t WHERE t.from_uid = v_uid OR t.to_uid = v_uid;
    v_result := v_result || jsonb_build_object('team_invites', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('team_invites', null); END;

  -- team_requests
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.team_requests t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('team_requests', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('team_requests', null); END;

  -- wallets
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.volt_credits t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('volt_credits', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('volt_credits', null); END;
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.volt_credit_transactions t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('volt_credit_transactions', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('volt_credit_transactions', null); END;
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.volt_tokens t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('volt_tokens', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('volt_tokens', null); END;
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.volt_token_transactions t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('volt_token_transactions', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('volt_token_transactions', null); END;

  -- achievements
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.user_achievements t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('user_achievements', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('user_achievements', null); END;
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.user_titles t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('user_titles', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('user_titles', null); END;
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.user_loot_boxes t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('user_loot_boxes', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('user_loot_boxes', null); END;
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.user_season_pass_progress t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('season_pass_progress', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('season_pass_progress', null); END;

  -- daily challenges + streaks
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.user_daily_claims t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('user_daily_claims', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('user_daily_claims', null); END;
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.user_daily_challenges t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('user_daily_challenges', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('user_daily_challenges', null); END;
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.daily_login_streaks t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('daily_login_streaks', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('daily_login_streaks', null); END;

  -- spin
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.user_spin_history t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('user_spin_history', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('user_spin_history', null); END;

  -- follows
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.follows t WHERE t.follower_id = v_uid OR t.followee_id = v_uid;
    v_result := v_result || jsonb_build_object('follows', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('follows', null); END;

  -- hwid history
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.hwid_history t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('hwid_history', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('hwid_history', null); END;

  -- bans + appeals
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.user_bans t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('user_bans', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('user_bans', null); END;
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.ban_appeals t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('ban_appeals', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('ban_appeals', null); END;

  -- payments
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.payment_orders t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('payment_orders', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('payment_orders', null); END;
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.premium_subscriptions t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('premium_subscriptions', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('premium_subscriptions', null); END;

  -- credit transfers
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.credit_transfers t WHERE t.from_user_id = v_uid OR t.to_user_id = v_uid;
    v_result := v_result || jsonb_build_object('credit_transfers', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('credit_transfers', null); END;

  -- reactions
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.message_reactions t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('message_reactions', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('message_reactions', null); END;

  -- lucky boxes
  BEGIN SELECT coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_tmp
      FROM public.user_lucky_boxes t WHERE t.user_id = v_uid;
    v_result := v_result || jsonb_build_object('user_lucky_boxes', v_tmp);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('user_lucky_boxes', null); END;

  RETURN jsonb_build_object('success', true, 'data', v_result);
END;
$$;


--
-- Name: export_user_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.export_user_data() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_user_id UUID := auth.uid();
DECLARE v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  SELECT jsonb_build_object(
    'success', true,
    'exported_at', now(),
    'profile', (SELECT to_jsonb(u) - 'hwid' - 'last_ip' FROM public.users u WHERE u.id = v_user_id),
    'scores', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM public.scores s WHERE s.user_id = v_user_id), '[]'::jsonb),
    'run_history', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.run_history r WHERE r.user_id = v_user_id), '[]'::jsonb),
    'global_chat', COALESCE((SELECT jsonb_agg(to_jsonb(g)) FROM public.global_chat g WHERE g.uid = v_user_id), '[]'::jsonb),
    'direct_messages_sent', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM public.direct_messages d WHERE d.from_uid = v_user_id), '[]'::jsonb),
    'duels', COALESCE((SELECT jsonb_agg(to_jsonb(dm)) FROM public.duel_matches dm WHERE dm.challenger_uid = v_user_id OR dm.opponent_uid = v_user_id), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END $$;


--
-- Name: finalize_duel_from_live_states(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_duel_from_live_states(p_match_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  r public.duel_matches%ROWTYPE;
  v_ch_live public.duel_run_states%ROWTYPE;
  v_op_live public.duel_run_states%ROWTYPE;
  v_ch_live_found BOOLEAN;
  v_op_live_found BOOLEAN;
  v_ch_score NUMERIC;
  v_op_score NUMERIC;
  v_ch_live_score NUMERIC;
  v_op_live_score NUMERIC;
  v_round_winner UUID;
  v_round_winner_side VARCHAR(20);
  v_series_winner UUID;
  v_series_winner_side VARCHAR(20);
  v_ch_wins INTEGER;
  v_op_wins INTEGER;
  v_series_wins INTEGER;
  v_series_max INTEGER;
  v_round INTEGER;
  v_completed_count INTEGER := 0;
  v_round_completed_count INTEGER := 0;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  FOR r IN
    SELECT *
    FROM public.duel_matches
    WHERE status = 'active'
      AND (p_match_id IS NULL OR id = p_match_id)
    FOR UPDATE
  LOOP
    v_series_wins := public.duel_clean_series_wins(r.series_wins_required);
    v_series_max := public.duel_series_max_rounds(v_series_wins);
    v_round := LEAST(v_series_max, GREATEST(1, COALESCE(r.current_round, 1)));
    v_ch_wins := GREATEST(0, COALESCE(r.challenger_round_wins, 0));
    v_op_wins := GREATEST(0, COALESCE(r.opponent_round_wins, 0));

    SELECT * INTO v_ch_live
    FROM public.duel_run_states
    WHERE match_id = r.id AND user_id = r.challenger_uid
    FOR UPDATE;
    v_ch_live_found := FOUND;

    v_op_live_found := FALSE;
    IF r.opponent_uid IS NOT NULL THEN
      SELECT * INTO v_op_live
      FROM public.duel_run_states
      WHERE match_id = r.id AND user_id = r.opponent_uid
      FOR UPDATE;
      v_op_live_found := FOUND;
    END IF;

    SELECT score INTO v_ch_score FROM public.duel_match_results WHERE match_id = r.id AND user_id = r.challenger_uid;
    IF COALESCE(r.is_bot_match, FALSE) THEN
      IF r.bot_score IS NOT NULL AND v_now >= (COALESCE(r.started_at, r.accepted_at, r.bot_generated_at, r.created_at) + (GREATEST(1, r.bot_score)::TEXT || ' seconds')::INTERVAL) THEN
        v_op_score := r.bot_score;
      ELSE
        v_op_score := NULL;
      END IF;
    ELSE
      SELECT score INTO v_op_score FROM public.duel_match_results WHERE match_id = r.id AND user_id = r.opponent_uid;
    END IF;

    IF v_ch_score IS NULL AND v_ch_live_found AND v_ch_live.state = 'finished' THEN
      v_ch_live_score := public.duel_live_score_seconds(v_ch_live.elapsed_ms, v_ch_live.run_started_at, v_ch_live.last_seen_at, v_now);
      IF v_ch_live_score >= 1 THEN
        INSERT INTO public.duel_match_results(match_id, user_id, score)
        VALUES (r.id, r.challenger_uid, v_ch_live_score)
        ON CONFLICT (match_id, user_id) DO NOTHING;
        SELECT score INTO v_ch_score FROM public.duel_match_results WHERE match_id = r.id AND user_id = r.challenger_uid;
      END IF;
    END IF;

    IF NOT COALESCE(r.is_bot_match, FALSE) AND v_op_score IS NULL AND v_op_live_found AND v_op_live.state = 'finished' THEN
      v_op_live_score := public.duel_live_score_seconds(v_op_live.elapsed_ms, v_op_live.run_started_at, v_op_live.last_seen_at, v_now);
      IF v_op_live_score >= 1 THEN
        INSERT INTO public.duel_match_results(match_id, user_id, score)
        VALUES (r.id, r.opponent_uid, v_op_live_score)
        ON CONFLICT (match_id, user_id) DO NOTHING;
        SELECT score INTO v_op_score FROM public.duel_match_results WHERE match_id = r.id AND user_id = r.opponent_uid;
      END IF;
    END IF;

    IF v_ch_score IS NOT NULL AND v_op_score IS NOT NULL THEN
      v_round_winner := NULL;
      v_round_winner_side := 'draw';
      IF v_ch_score > v_op_score THEN
        v_round_winner := r.challenger_uid;
        v_round_winner_side := 'challenger';
        v_ch_wins := v_ch_wins + 1;
      ELSIF v_op_score > v_ch_score THEN
        v_round_winner := CASE WHEN COALESCE(r.is_bot_match, FALSE) THEN NULL ELSE r.opponent_uid END;
        v_round_winner_side := 'opponent';
        v_op_wins := v_op_wins + 1;
      END IF;

      INSERT INTO public.duel_round_results(match_id, round_number, challenger_uid, opponent_uid, challenger_score, opponent_score, winner_uid, winner_side, completed_at)
      VALUES (r.id, v_round, r.challenger_uid, r.opponent_uid, v_ch_score, v_op_score, v_round_winner, v_round_winner_side, v_now)
      ON CONFLICT (match_id, round_number) DO UPDATE
        SET challenger_score = EXCLUDED.challenger_score,
            opponent_score = EXCLUDED.opponent_score,
            winner_uid = EXCLUDED.winner_uid,
            winner_side = EXCLUDED.winner_side,
            completed_at = EXCLUDED.completed_at;

      IF v_ch_wins >= v_series_wins OR v_op_wins >= v_series_wins OR v_round >= v_series_max THEN
        v_series_winner := NULL;
        v_series_winner_side := 'draw';
        IF v_ch_wins > v_op_wins THEN
          v_series_winner := r.challenger_uid;
          v_series_winner_side := 'challenger';
        ELSIF v_op_wins > v_ch_wins THEN
          v_series_winner := CASE WHEN COALESCE(r.is_bot_match, FALSE) THEN NULL ELSE r.opponent_uid END;
          v_series_winner_side := 'opponent';
        END IF;

        PERFORM public.finish_duel_payout(r.id, v_series_winner);

        UPDATE public.duel_matches
        SET status = 'completed',
            winner_uid = v_series_winner,
            winner_side = v_series_winner_side,
            series_winner_uid = v_series_winner,
            series_winner_side = v_series_winner_side,
            challenger_round_wins = v_ch_wins,
            opponent_round_wins = v_op_wins,
            series_wins_required = v_series_wins,
            series_max_rounds = v_series_max,
            current_round = v_round,
            completed_at = v_now,
            series_completed_at = v_now
        WHERE id = r.id AND status = 'active';

        IF FOUND THEN v_completed_count := v_completed_count + 1; END IF;
      ELSE
        DELETE FROM public.duel_match_results WHERE match_id = r.id;
        UPDATE public.duel_run_states
        SET state = 'idle',
            elapsed_ms = 0,
            run_started_at = NULL,
            last_seen_at = v_now,
            updated_at = v_now
        WHERE match_id = r.id;

        UPDATE public.duel_matches
        SET challenger_round_wins = v_ch_wins,
            opponent_round_wins = v_op_wins,
            series_wins_required = v_series_wins,
            series_max_rounds = v_series_max,
            current_round = v_round + 1,
            started_at = v_now,
            ends_at = v_now + INTERVAL '13 hours'
        WHERE id = r.id AND status = 'active';

        v_round_completed_count := v_round_completed_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'completed_count', v_completed_count, 'round_completed_count', v_round_completed_count);
END;
$$;


--
-- Name: finalize_payment_order(uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_payment_order(p_order_id uuid, p_provider_event_id text, p_provider_payment_id text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_order public.payment_orders%ROWTYPE;
  v_duration INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'payment_order_required';
  END IF;

  SELECT * INTO v_order
  FROM public.payment_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_order_not_found';
  END IF;

  IF v_order.status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true, 'order_id', v_order.id, 'status', v_order.status);
  END IF;

  IF v_order.status NOT IN ('pending','checkout_created') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_order_status', 'order_id', v_order.id, 'status', v_order.status);
  END IF;

  UPDATE public.payment_orders
  SET status = 'paid',
      provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('paid_payload', COALESCE(p_payload, '{}'::jsonb), 'provider_event_id', p_provider_event_id),
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = v_order.id;

  IF v_order.product_type = 'tokens' THEN
    PERFORM public.apply_token_delta(v_order.user_id, v_order.tokens, 'purchase', 'Achat sécurisé de tokens', v_order.id);
  ELSIF v_order.product_type = 'premium' THEN
    v_duration := CASE v_order.grade WHEN 'star' THEN 30 WHEN 'elite' THEN 30 ELSE NULL END;
    PERFORM public.assign_grade(v_order.user_id, v_order.grade, v_duration, v_order.amount_cents, v_order.provider, COALESCE(p_provider_payment_id, p_provider_event_id, v_order.id::TEXT));

    INSERT INTO public.subscriptions(user_id, provider, provider_customer_id, provider_subscription_id, grade, status, current_period_start, current_period_end, source_order_id)
    VALUES (
      v_order.user_id,
      v_order.provider,
      NULLIF(p_payload->>'customer', ''),
      NULLIF(p_payload->>'subscription', ''),
      v_order.grade,
      'active',
      NOW(),
      CASE WHEN v_duration IS NULL THEN NULL ELSE NOW() + (v_duration || ' days')::INTERVAL END,
      v_order.id
    )
    ON CONFLICT (provider, provider_subscription_id) WHERE provider_subscription_id IS NOT NULL DO UPDATE
      SET grade = EXCLUDED.grade,
          status = 'active',
          current_period_end = EXCLUDED.current_period_end,
          source_order_id = EXCLUDED.source_order_id,
          updated_at = NOW();
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'status', 'paid', 'product_type', v_order.product_type, 'tokens', v_order.tokens, 'grade', v_order.grade);
END;
$$;


--
-- Name: finish_duel_payout(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finish_duel_payout(p_match_id uuid, p_winner uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_match public.duel_matches%ROWTYPE;
  v_pot INTEGER;
BEGIN
  SELECT * INTO v_match FROM public.duel_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF COALESCE(v_match.is_bot_match, FALSE) THEN
    PERFORM public.refund_duel_escrow(v_match.id);
    RETURN;
  END IF;

  v_pot := COALESCE(v_match.challenger_token_escrow, 0) + COALESCE(v_match.opponent_token_escrow, 0);
  IF v_pot <= 0 THEN RETURN; END IF;

  IF p_winner IS NULL THEN
    PERFORM public.refund_duel_escrow(v_match.id);
  ELSE
    PERFORM public.apply_token_delta(p_winner, v_pot, 'duel_win', 'Gain 1v1 tokens', v_match.id);
    UPDATE public.duel_matches
    SET challenger_token_escrow = 0,
        opponent_token_escrow = 0,
        challenger_escrow = 0,
        opponent_escrow = 0
    WHERE id = p_match_id;
  END IF;
END;
$$;


--
-- Name: flag_suspicious_duel(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.flag_suspicious_duel() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_ch_ip text; v_op_ip text;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' OR NEW.opponent_uid IS NULL OR NEW.is_bot_match THEN
    RETURN NEW;
  END IF;
  SELECT last_ip INTO v_ch_ip FROM public.users WHERE id = NEW.challenger_uid;
  SELECT last_ip INTO v_op_ip FROM public.users WHERE id = NEW.opponent_uid;
  IF v_ch_ip IS NOT NULL AND v_op_ip IS NOT NULL AND v_ch_ip = v_op_ip THEN
    BEGIN
      INSERT INTO public.moderation_log (kind, actor_user_id, target_user_id, payload)
      VALUES ('duel_same_ip', NEW.challenger_uid, NEW.opponent_uid,
              jsonb_build_object('match_id', NEW.id, 'ip', v_ch_ip,
                                 'wager', NEW.wager_tokens, 'winner', NEW.winner_uid));
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: generate_chat_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_chat_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Sort both UUIDs alphabetically and concatenate them to form a canonical chat room ID
  IF NEW.from_uid < NEW.to_uid THEN
    NEW.chat_id := NEW.from_uid || '_' || NEW.to_uid;
  ELSE
    NEW.chat_id := NEW.to_uid || '_' || NEW.from_uid;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: generate_duel_bot_score(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_duel_bot_score() RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_roll DOUBLE PRECISION := random();
  v_score NUMERIC;
  v_bucket TEXT;
BEGIN
  IF v_roll < 0.30 THEN
    v_bucket := '1_5_min';
    v_score := ROUND((60 + random() * 240)::numeric, 3);
  ELSIF v_roll < 0.70 THEN
    v_bucket := '5_15_min';
    v_score := ROUND((300 + random() * 600)::numeric, 3);
  ELSE
    v_bucket := '15_60_min';
    v_score := ROUND((900 + random() * 2700)::numeric, 3);
  END IF;

  IF v_score IS NULL OR v_score < 60 THEN
    v_score := 60;
    v_bucket := COALESCE(v_bucket, '1_5_min');
  END IF;
  IF v_score > 3600 THEN
    v_score := 3600;
  END IF;

  RETURN jsonb_build_object('score', v_score, 'bucket', v_bucket);
END;
$$;


--
-- Name: generate_duel_bot_score_for_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_duel_bot_score_for_user(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_avg NUMERIC := public.volt_user_recent_average_seconds(p_user_id);
  v_roll DOUBLE PRECISION := random();
  v_multiplier NUMERIC;
  v_score NUMERIC;
  v_bucket TEXT;
  v_fallback JSONB;
BEGIN
  IF v_avg IS NULL THEN
    v_fallback := public.generate_duel_bot_score();
    RETURN jsonb_build_object(
      'score', (v_fallback->>'score')::NUMERIC,
      'bucket', COALESCE(v_fallback->>'bucket', 'fallback_distribution'),
      'source', 'fallback_distribution',
      'player_average', NULL
    );
  END IF;

  -- Target: most bots are slightly above the player's average.
  -- Example: 10 min average -> usually around 13m30-16m30, often close to 15m.
  IF v_roll < 0.30 THEN
    v_bucket := 'avg_easy';
    v_multiplier := 1.10 + random() * 0.25;
  ELSIF v_roll < 0.70 THEN
    v_bucket := 'avg_balanced';
    v_multiplier := 1.35 + random() * 0.30;
  ELSE
    v_bucket := 'avg_hard';
    v_multiplier := 1.65 + random() * 0.55;
  END IF;

  v_score := ROUND((v_avg * v_multiplier)::NUMERIC, 3);
  v_score := LEAST(3600, GREATEST(60, v_score));

  RETURN jsonb_build_object(
    'score', v_score,
    'bucket', v_bucket,
    'source', 'recent_average',
    'player_average', ROUND(v_avg, 3),
    'multiplier', ROUND(v_multiplier, 3)
  );
END;
$$;


--
-- Name: generate_duel_bot_score_v2(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_duel_bot_score_v2(p_user_id uuid) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_elo numeric;
  v_min numeric;
  v_max numeric;
  v_random numeric;
BEGIN
  SELECT COALESCE(duel_elo, 1000) INTO v_elo
    FROM player_elo
   WHERE user_id = p_user_id;

  IF v_elo IS NULL THEN v_elo := 1000; END IF;

  SELECT min_seconds, max_seconds INTO v_min, v_max
    FROM duel_bot_brackets
   WHERE v_elo >= min_elo AND v_elo < max_elo
   ORDER BY min_elo DESC
   LIMIT 1;

  IF v_min IS NULL THEN
    -- Defensive fallback covering the whole valid range.
    v_min := 60; v_max := 240;
  END IF;

  -- Pseudo-uniform random within bracket. Sampled from gen_random_bytes
  -- to avoid the weak default seed of RANDOM(). Deterministic insofar
  -- as it returns one fresh value per call.
  v_random := (get_byte(gen_random_bytes(2), 0) * 256
               + get_byte(gen_random_bytes(2), 1)) / 65535.0;

  RETURN ROUND(v_min + (v_max - v_min) * v_random, 2);
END $$;


--
-- Name: generate_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_referral_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(LEFT(replace(gen_random_uuid()::text, '-', ''), 8));
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: get_client_ip(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_client_ip() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_headers JSONB;
  v_ip TEXT;
BEGIN
  v_headers := COALESCE(current_setting('request.headers', true)::jsonb, '{}'::jsonb);
  v_ip := COALESCE(
    v_headers->>'cf-connecting-ip',
    v_headers->>'x-real-ip',
    split_part(v_headers->>'x-forwarded-for', ',', 1)
  );
  RETURN NULLIF(btrim(v_ip), '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;


--
-- Name: get_credit_transfer_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_credit_transfer_history() RETURNS TABLE(id uuid, direction text, other_username text, amount integer, note text, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT ct.id,
    CASE WHEN ct.from_user_id = auth.uid() THEN 'sent' ELSE 'received' END,
    u.username, ct.amount, ct.note, ct.created_at
  FROM credit_transfers ct
  JOIN users u ON u.id = CASE WHEN ct.from_user_id = auth.uid() THEN ct.to_user_id ELSE ct.from_user_id END
  WHERE ct.from_user_id = auth.uid() OR ct.to_user_id = auth.uid()
  ORDER BY ct.created_at DESC LIMIT 50;
$$;


--
-- Name: get_current_season(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_season() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_row record;
BEGIN
  SELECT id, name, starts_at, ends_at, is_active
    INTO v_row
    FROM elo_seasons
   WHERE is_active = true
     AND now() BETWEEN starts_at AND ends_at
   ORDER BY starts_at DESC
   LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'season', NULL);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'season', jsonb_build_object(
      'id', v_row.id,
      'name', v_row.name,
      'starts_at', v_row.starts_at,
      'ends_at', v_row.ends_at,
      'is_active', v_row.is_active,
      'remaining_seconds', GREATEST(0, EXTRACT(EPOCH FROM (v_row.ends_at - now()))::bigint)
    )
  );
END $$;


--
-- Name: get_current_season_rank(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_season_rank(p_user_id uuid) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT json_build_object(
    'season', (SELECT row_to_json(s) FROM seasons s WHERE is_active LIMIT 1),
    'user_elo', (SELECT duel_elo FROM player_elo WHERE user_id = p_user_id),
    'rank', (
      SELECT COUNT(*) + 1 FROM player_elo
      WHERE duel_elo > (SELECT duel_elo FROM player_elo WHERE user_id = p_user_id)
        AND duel_elo IS NOT NULL
    ),
    'total_players', (SELECT COUNT(*) FROM player_elo WHERE duel_elo IS NOT NULL),
    'days_remaining', (
      SELECT (end_date - CURRENT_DATE) FROM seasons WHERE is_active LIMIT 1
    )
  );
$$;


--
-- Name: get_daily_reward_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_daily_reward_status(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_streak      INTEGER;
  v_day_idx     INTEGER;
  v_claimed     BOOLEAN;
  v_upcoming    JSON;
BEGIN
  SELECT COALESCE(current_streak, 1) INTO v_streak
  FROM daily_login_streaks WHERE user_id = p_user_id;
  IF v_streak IS NULL THEN v_streak := 1; END IF;

  v_day_idx := ((v_streak - 1) % 30) + 1;
  v_claimed  := EXISTS (
    SELECT 1 FROM user_daily_claims
    WHERE user_id = p_user_id AND last_claim_date = CURRENT_DATE
  );

  SELECT json_agg(r ORDER BY r.day) INTO v_upcoming
  FROM daily_rewards r
  WHERE r.day BETWEEN v_day_idx AND LEAST(v_day_idx + 6, 30);

  -- Si la fenêtre dépasse 30, compléter depuis le début
  IF v_day_idx + 6 > 30 THEN
    SELECT json_agg(r ORDER BY r.day) INTO v_upcoming
    FROM (
      SELECT * FROM daily_rewards WHERE day >= v_day_idx
      UNION ALL
      SELECT * FROM daily_rewards WHERE day <= (v_day_idx + 6) - 30
    ) r;
  END IF;

  RETURN json_build_object(
    'claimed_today',    v_claimed,
    'streak',           v_streak,
    'day_index',        v_day_idx,
    'upcoming_rewards', COALESCE(v_upcoming, '[]'::json)
  );
END;
$$;


--
-- Name: get_duel_bot_score(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_duel_bot_score(p_match_id uuid) RETURNS integer
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
      DECLARE v_score integer; v_status text; v_uid uuid := auth.uid();
      BEGIN
        IF v_uid IS NULL THEN RETURN NULL; END IF;
        SELECT bot_score, status INTO v_score, v_status
          FROM public.duel_matches
          WHERE id = p_match_id
            AND (challenger_uid = v_uid OR opponent_uid = v_uid OR public.is_admin());
        IF v_status <> 'completed' AND NOT public.is_admin() THEN RETURN NULL; END IF;
        RETURN v_score;
      END $$;


--
-- Name: get_duel_lobby(character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_duel_lobby(p_query character varying DEFAULT ''::character varying, p_limit integer DEFAULT 20) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_query TEXT := lower(trim(COALESCE(p_query, '')));
  v_limit INTEGER := LEAST(50, GREATEST(1, COALESCE(p_limit, 20)));
  v_players JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated', 'players', '[]'::jsonb);
  END IF;

  PERFORM public.expire_old_duels();

  SELECT COALESCE(jsonb_agg(row_item ORDER BY online DESC, has_open_duel ASC, is_running DESC, pseudo_sort ASC), '[]'::jsonb)
  INTO v_players
  FROM (
    SELECT
      COALESCE(u.pseudo, u.username, 'Anonyme') AS pseudo_sort,
      (vp.last_seen_at IS NOT NULL AND vp.last_seen_at > NOW() - INTERVAL '90 seconds') AS online,
      EXISTS (
        SELECT 1 FROM public.duel_matches dm
        WHERE dm.status IN ('pending', 'active')
          AND (dm.challenger_uid = u.id OR dm.opponent_uid = u.id)
      ) AS has_open_duel,
      EXISTS (
        SELECT 1
        FROM public.duel_run_states drs
        JOIN public.duel_matches dm2 ON dm2.id = drs.match_id
        WHERE drs.user_id = u.id
          AND dm2.status = 'active'
          AND drs.state = 'running'
          AND drs.last_seen_at > NOW() - INTERVAL '90 seconds'
      ) AS is_running,
      jsonb_build_object(
        'id', u.id,
        'pseudo', COALESCE(u.pseudo, u.username, 'Anonyme'),
        'profilePic', u."profilePic",
        'userLevel', u."userLevel",
        'grade', COALESCE(u.grade, 'free'),
        'grade_color', u.grade_color,
        'grade_color_mode', u.grade_color_mode,
        'grade_color_2', u.grade_color_2,
        'grade_color_angle', u.grade_color_angle,
        'online', (vp.last_seen_at IS NOT NULL AND vp.last_seen_at > NOW() - INTERVAL '90 seconds'),
        'last_seen_at', vp.last_seen_at,
        'presence_context', vp.context,
        'has_open_duel', EXISTS (
          SELECT 1 FROM public.duel_matches dm
          WHERE dm.status IN ('pending', 'active')
            AND (dm.challenger_uid = u.id OR dm.opponent_uid = u.id)
        ),
        'is_running', EXISTS (
          SELECT 1
          FROM public.duel_run_states drs
          JOIN public.duel_matches dm2 ON dm2.id = drs.match_id
          WHERE drs.user_id = u.id
            AND dm2.status = 'active'
            AND drs.state = 'running'
            AND drs.last_seen_at > NOW() - INTERVAL '90 seconds'
        )
      ) AS row_item
    FROM public.users u
    LEFT JOIN public.volt_presence vp ON vp.user_id = u.id
    WHERE u.id <> v_user_id
      AND COALESCE(u.is_banned, false) = false
      AND COALESCE(u.pseudo, u.username, '') <> ''
      AND (
        v_query = ''
        OR lower(COALESCE(u.pseudo, u.username, '')) LIKE '%' || v_query || '%'
      )
    ORDER BY online DESC, has_open_duel ASC, is_running DESC, pseudo_sort ASC
    LIMIT v_limit
  ) q;

  RETURN jsonb_build_object('success', true, 'players', v_players);
END;
$$;


--
-- Name: get_elo_leaderboard(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_elo_leaderboard(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_limit INTEGER := LEAST(100, GREATEST(1, COALESCE(p_limit, 50)));
  v_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
  v_items JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_item ORDER BY rank_position ASC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      (v_offset + ROW_NUMBER() OVER (ORDER BY pe.duel_elo DESC, pe.wins DESC, pe.duels_played DESC, u.pseudo ASC)) AS rank_position,
      jsonb_build_object(
        'position', v_offset + ROW_NUMBER() OVER (ORDER BY pe.duel_elo DESC, pe.wins DESC, pe.duels_played DESC, u.pseudo ASC),
        'user_id', pe.user_id,
        'pseudo', COALESCE(u.pseudo, u.username, 'Anonyme'),
        'profilePic', u."profilePic",
        'elo', pe.duel_elo,
        'rank', public.volt_elo_rank(pe.duel_elo),
        'wins', pe.wins,
        'losses', pe.losses,
        'draws', pe.draws,
        'duels_played', pe.duels_played,
        'winrate', CASE WHEN pe.duels_played > 0 THEN ROUND((pe.wins::NUMERIC / pe.duels_played::NUMERIC) * 100, 1) ELSE 0 END,
        'tokens_won_from_duels', pe.tokens_won_from_duels
      ) AS row_item
    FROM public.player_elo pe
    JOIN public.users u ON u.id = pe.user_id
    WHERE COALESCE(u.is_banned, false) = false
    ORDER BY pe.duel_elo DESC, pe.wins DESC, pe.duels_played DESC, u.pseudo ASC
    OFFSET v_offset LIMIT v_limit
  ) s;

  RETURN jsonb_build_object('success', true, 'leaderboard', v_items);
END;
$$;


--
-- Name: get_feature_flags(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_feature_flags() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_row public.app_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.app_settings ORDER BY updated_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'flags',            COALESCE(v_row.feature_flags, '{}'),
    'maintenance_mode', COALESCE(v_row.maintenance_mode, FALSE)
  );
END;
$$;


--
-- Name: get_friends_leaderboard(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_friends_leaderboard(p_category text DEFAULT 'no_coin_record'::text, p_limit integer DEFAULT 100) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user uuid := auth.uid();
  v_items jsonb;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  WITH my_friends AS (
    SELECT user2_id AS uid FROM public.friends WHERE user1_id = v_user
    UNION
    SELECT user1_id FROM public.friends WHERE user2_id = v_user
    UNION SELECT v_user
  )
  SELECT jsonb_agg(row_to_json(row_data) ORDER BY (row_data->>'time')::numeric ASC)
  INTO v_items
  FROM (
    SELECT s.user_id, s.time, COALESCE(u.pseudo, u.username, 'Anonyme') AS pseudo,
           u."profilePic", u.grade, u.grade_color, u.grade_color_mode, u.grade_color_2, u.grade_color_angle, u.grade_rainbow
    FROM public.scores s
    JOIN public.users u ON u.id = s.user_id
    WHERE s.user_id IN (SELECT uid FROM my_friends)
      AND s.category = p_category
      AND COALESCE(s.status, 'valid') = 'valid'
    ORDER BY s.time ASC
    LIMIT GREATEST(1, LEAST(200, p_limit))
  ) row_data;
  RETURN jsonb_build_object('success', true, 'rows', COALESCE(v_items, '[]'::jsonb));
END $$;


--
-- Name: get_head_to_head(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_head_to_head(p_opponent_uid uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total int := 0;
  v_wins int := 0;
  v_losses int := 0;
  v_ties int := 0;
  v_last_at timestamptz;
BEGIN
  IF v_uid IS NULL OR p_opponent_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_target');
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'completed' AND winner_uid = v_uid),
    COUNT(*) FILTER (WHERE status = 'completed' AND winner_uid = p_opponent_uid),
    COUNT(*) FILTER (WHERE status = 'completed' AND winner_uid IS NULL),
    MAX(completed_at)
  INTO v_total, v_wins, v_losses, v_ties, v_last_at
  FROM duel_matches
  WHERE ((challenger_uid = v_uid AND opponent_uid = p_opponent_uid)
      OR (challenger_uid = p_opponent_uid AND opponent_uid = v_uid))
    AND status = 'completed';

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'wins', v_wins,
    'losses', v_losses,
    'ties', v_ties,
    'last_played_at', v_last_at
  );
END $$;


--
-- Name: get_live_duel_state(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_live_duel_state(p_match_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_match record;
  v_participants jsonb;
  v_states jsonb;
  v_can_watch boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;

  SELECT id, status, challenger_uid, opponent_uid, started_at, ends_at,
         winner_uid, is_bot_match
    INTO v_match
    FROM duel_matches WHERE id = p_match_id;
  IF v_match.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Allowed if participant, admin, or friend with either side.
  IF v_match.challenger_uid = v_uid OR v_match.opponent_uid = v_uid OR has_admin_permission('view_audit_logs') THEN
    v_can_watch := true;
  ELSIF EXISTS (
    SELECT 1 FROM friends f
    WHERE (f.user_id = v_uid AND f.friend_id IN (v_match.challenger_uid, v_match.opponent_uid))
       OR (f.friend_id = v_uid AND f.user_id IN (v_match.challenger_uid, v_match.opponent_uid))
  ) THEN
    v_can_watch := true;
  END IF;

  IF NOT v_can_watch THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_allowed');
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'user_id', u.id, 'pseudo', u.pseudo, 'profile_pic', u.profilePic, 'grade', u.grade
  )) INTO v_participants
  FROM users u
  WHERE u.id IN (v_match.challenger_uid, v_match.opponent_uid);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', s.user_id, 'state', s.state,
    'elapsed_ms', s.elapsed_ms, 'run_started_at', s.run_started_at,
    'last_seen_at', s.last_seen_at
  )), '[]'::jsonb) INTO v_states
  FROM duel_run_states s WHERE s.match_id = p_match_id;

  RETURN jsonb_build_object(
    'success', true,
    'match', jsonb_build_object(
      'id', v_match.id, 'status', v_match.status,
      'started_at', v_match.started_at, 'ends_at', v_match.ends_at,
      'winner_uid', v_match.winner_uid, 'is_bot_match', v_match.is_bot_match
    ),
    'participants', COALESCE(v_participants, '[]'::jsonb),
    'states', v_states
  );
END $$;


--
-- Name: get_lucky_box_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_lucky_box_count() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  SELECT COALESCE(count, 0) INTO v_count FROM public.user_lucky_boxes WHERE user_id = v_uid;
  RETURN jsonb_build_object('success', true, 'count', COALESCE(v_count, 0));
END;
$$;


--
-- Name: get_my_active_grade(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_active_grade() RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_grade text;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'grade', NULL, 'error', 'not_authenticated');
  END IF;

  SELECT lower(COALESCE(grade, '')), grade_expires_at
    INTO v_grade, v_expires
    FROM users
   WHERE id = v_uid;

  IF v_grade = '' THEN v_grade := NULL; END IF;

  IF v_expires IS NOT NULL AND v_expires < now() THEN
    RETURN jsonb_build_object('success', true, 'grade', NULL, 'expired', true,
                              'expires_at', v_expires);
  END IF;

  RETURN jsonb_build_object('success', true, 'grade', v_grade,
                            'expires_at', v_expires);
END $$;


--
-- Name: get_my_cosmetics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_cosmetics() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_owned  jsonb;
  v_active jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT
    COALESCE(cosmetics_owned,  '[]'::jsonb),
    COALESCE(cosmetics_active, '{}'::jsonb)
  INTO v_owned, v_active
  FROM public.users
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'owned',   v_owned,
    'active',  v_active
  );
END;
$$;


--
-- Name: get_my_credit_transactions(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_credit_transactions(p_limit integer DEFAULT 30) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
  v_transactions JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_transactions
  FROM (
    SELECT amount, type, description, created_at
    FROM public.volt_credit_transactions
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
    LIMIT v_limit
  ) t;

  RETURN jsonb_build_object('success', true, 'transactions', v_transactions);
END;
$$;


--
-- Name: get_my_credits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_credits() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  
  SELECT COALESCE(credits, 0) INTO v_balance FROM public.users WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'balance', v_balance,
    'total_earned', 0
  );
END;
$$;


--
-- Name: get_my_dm_conversations(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_dm_conversations(p_limit integer DEFAULT 100) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_limit INTEGER := LEAST(200, GREATEST(1, COALESCE(p_limit, 100)));
  v_items JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated', 'conversations', '[]'::jsonb);
  END IF;

  WITH ranked AS (
    SELECT
      dm.*,
      CASE WHEN dm.from_uid = v_user_id THEN dm.to_uid ELSE dm.from_uid END AS partner_uid,
      row_number() OVER (PARTITION BY dm.chat_id ORDER BY dm.sent_at DESC) AS rn
    FROM public.direct_messages dm
    WHERE dm.from_uid = v_user_id OR dm.to_uid = v_user_id
  ),
  last_msg AS (
    SELECT chat_id, partner_uid, message AS last_message, sent_at AS last_sent_at
    FROM ranked
    WHERE rn = 1
    ORDER BY sent_at DESC
    LIMIT v_limit
  ),
  unread AS (
    SELECT chat_id, COUNT(*)::INT AS unread_count
    FROM public.direct_messages
    WHERE to_uid = v_user_id AND COALESCE(is_read, false) = false
    GROUP BY chat_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'chat_id', r.chat_id,
    'partner_uid', r.partner_uid,
    'last_message', r.last_message,
    'last_sent_at', r.last_sent_at,
    'unread_count', COALESCE(u.unread_count, 0),
    'partner', jsonb_build_object(
      'id', p.id,
      'pseudo', COALESCE(p.pseudo, p.username, 'Anonyme'),
      'profilePic', p."profilePic",
      'grade', COALESCE(p.grade, 'free'),
      'grade_color', p.grade_color,
      'grade_color_mode', p.grade_color_mode,
      'grade_color_2', p.grade_color_2,
      'grade_color_angle', p.grade_color_angle
    )
  ) ORDER BY r.last_sent_at DESC), '[]'::jsonb)
  INTO v_items
  FROM last_msg r
  LEFT JOIN unread u ON u.chat_id = r.chat_id
  LEFT JOIN public.profiles p ON p.id = r.partner_uid;

  RETURN jsonb_build_object('success', true, 'conversations', v_items);
END;
$$;


--
-- Name: get_my_duels(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_duels(p_limit integer DEFAULT 20) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_limit INTEGER := LEAST(50, GREATEST(1, COALESCE(p_limit, 20)));
  v_items JSONB;
  v_queue JSONB;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;

  IF random() < 0.005 THEN PERFORM public.expire_old_duels(); END IF;

  SELECT jsonb_build_object(
    'mode', mode,
    'wager_tokens', COALESCE(wager_tokens, wager_credits, 0),
    'wager_credits', COALESCE(wager_tokens, wager_credits, 0),
    'series_wins_required', public.duel_clean_series_wins(series_wins_required),
    'series_max_rounds', public.duel_series_max_rounds(series_wins_required),
    'created_at', created_at,
    'bot_claim_at', created_at + INTERVAL '60 seconds',
    'bot_seconds_remaining', GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((created_at + INTERVAL '60 seconds') - NOW())))::INTEGER)
  ) INTO v_queue
  FROM public.duel_random_queue
  WHERE user_id = v_user_id;

  -- OPTIM 2026-05-10 V4: pre-filter duel_matches to v_limit rows BEFORE the 9-way JOIN.
  -- New indexes idx_duel_matches_challenger_uid + idx_duel_matches_opponent_uid (created_at DESC)
  -- make the pre-filter cheap. Skipping completed_at > 30d to preserve full history per user.
  WITH limited_matches AS (
    SELECT d.*
    FROM public.duel_matches d
    WHERE d.challenger_uid = v_user_id OR d.opponent_uid = v_user_id
    ORDER BY COALESCE(d.completed_at, d.accepted_at, d.created_at) DESC
    LIMIT v_limit
  )
  SELECT COALESCE(jsonb_agg(row_item ORDER BY sort_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      COALESCE(d.completed_at, d.accepted_at, d.created_at) AS sort_at,
      jsonb_build_object(
        'id', d.id,
        'mode', d.mode,
        'status', d.status,
        'created_at', d.created_at,
        'expires_at', d.expires_at,
        'accepted_at', d.accepted_at,
        'started_at', d.started_at,
        'ends_at', d.ends_at,
        'completed_at', d.completed_at,
        'winner_uid', d.winner_uid,
        'winner_side', d.winner_side,
        'series_winner_uid', d.series_winner_uid,
        'series_winner_side', d.series_winner_side,
        'series_completed_at', d.series_completed_at,
        'series_wins_required', public.duel_clean_series_wins(d.series_wins_required),
        'series_max_rounds', public.duel_series_max_rounds(d.series_wins_required),
        'current_round', GREATEST(1, COALESCE(d.current_round, 1)),
        'challenger_round_wins', GREATEST(0, COALESCE(d.challenger_round_wins, 0)),
        'opponent_round_wins', GREATEST(0, COALESCE(d.opponent_round_wins, 0)),
        'round_results', COALESCE(rr.rounds, '[]'::jsonb),
        'is_bot_match', COALESCE(d.is_bot_match, FALSE),
        'bot_score', d.bot_score,
        'bot_pseudo', d.bot_pseudo,
        'bot_generated_at', d.bot_generated_at,
        'bot_distribution_bucket', d.bot_distribution_bucket,
        'wager_tokens', COALESCE(d.wager_tokens, d.wager_credits, 0),
        'wager_credits', COALESCE(d.wager_tokens, d.wager_credits, 0),
        'challenger_uid', d.challenger_uid,
        'opponent_uid', d.opponent_uid,
        'challenger_score', cr.score,
        'opponent_score', CASE WHEN COALESCE(d.is_bot_match, FALSE) THEN CASE WHEN NOW() >= (COALESCE(d.started_at, d.accepted_at, d.bot_generated_at, d.created_at) + (GREATEST(1, COALESCE(d.bot_score, 0))::TEXT || ' seconds')::INTERVAL) THEN d.bot_score ELSE NULL END ELSE orr.score END,
        'challenger_submitted_at', cr.submitted_at,
        'opponent_submitted_at', CASE WHEN COALESCE(d.is_bot_match, FALSE) THEN CASE WHEN NOW() >= (COALESCE(d.started_at, d.accepted_at, d.bot_generated_at, d.created_at) + (GREATEST(1, COALESCE(d.bot_score, 0))::TEXT || ' seconds')::INTERVAL) THEN (COALESCE(d.started_at, d.accepted_at, d.bot_generated_at, d.created_at) + (GREATEST(1, COALESCE(d.bot_score, 0))::TEXT || ' seconds')::INTERVAL) ELSE NULL END ELSE orr.submitted_at END,
        'challenger_online', (cp.last_seen_at IS NOT NULL AND cp.last_seen_at > NOW() - INTERVAL '90 seconds'),
        'opponent_online', CASE WHEN COALESCE(d.is_bot_match, FALSE) THEN TRUE ELSE (op.last_seen_at IS NOT NULL AND op.last_seen_at > NOW() - INTERVAL '90 seconds') END,
        'challenger_last_seen_at', cp.last_seen_at,
        'opponent_last_seen_at', CASE WHEN COALESCE(d.is_bot_match, FALSE) THEN NOW() ELSE op.last_seen_at END,
        'challenger_live', CASE WHEN cls.match_id IS NULL THEN NULL ELSE jsonb_build_object('state', cls.state, 'elapsed_ms', cls.elapsed_ms, 'run_started_at', cls.run_started_at, 'last_seen_at', cls.last_seen_at, 'updated_at', cls.updated_at) END,
        'opponent_live', CASE
          WHEN COALESCE(d.is_bot_match, FALSE) THEN jsonb_build_object('state', CASE WHEN NOW() >= (COALESCE(d.started_at, d.accepted_at, d.bot_generated_at, d.created_at) + (GREATEST(1, COALESCE(d.bot_score, 0))::TEXT || ' seconds')::INTERVAL) THEN 'finished' ELSE 'running' END, 'elapsed_ms', GREATEST(0, LEAST(ROUND(COALESCE(d.bot_score, 0) * 1000)::INTEGER, ROUND(EXTRACT(EPOCH FROM (NOW() - COALESCE(d.started_at, d.accepted_at, d.bot_generated_at, d.created_at))) * 1000)::INTEGER)), 'run_started_at', COALESCE(d.started_at, d.accepted_at, d.bot_generated_at, d.created_at), 'last_seen_at', NOW(), 'updated_at', NOW(), 'bot_target_elapsed_ms', ROUND(COALESCE(d.bot_score, 0) * 1000)::INTEGER)
          WHEN ols.match_id IS NULL THEN NULL
          ELSE jsonb_build_object('state', ols.state, 'elapsed_ms', ols.elapsed_ms, 'run_started_at', ols.run_started_at, 'last_seen_at', ols.last_seen_at, 'updated_at', ols.updated_at)
        END,
        'challenger', jsonb_build_object('id', cu.id, 'pseudo', COALESCE(cu.pseudo, cu.username, 'Anonyme'), 'profilePic', cu."profilePic", 'userLevel', cu."userLevel", 'grade', COALESCE(cu.grade, 'free'), 'grade_color', cu.grade_color, 'grade_color_mode', cu.grade_color_mode, 'grade_color_2', cu.grade_color_2, 'grade_color_angle', cu.grade_color_angle, 'online', (cp.last_seen_at IS NOT NULL AND cp.last_seen_at > NOW() - INTERVAL '90 seconds'), 'last_seen_at', cp.last_seen_at, 'is_bot', false),
        'opponent', CASE
          WHEN COALESCE(d.is_bot_match, FALSE) THEN jsonb_build_object('id', 'opponent_' || substring(d.id::text from 1 for 8), 'pseudo', COALESCE(NULLIF(d.bot_pseudo, ''), (ARRAY['Nexo','Kaori','Riven','Aksel','Milo','Sora','Kairo','Nyx','Zayn','Eden','Luna','Orion','Rafa','Ilyas','Noa','Tao'])[1 + (ABS(hashtext(d.id::text)) % 16)]), 'profilePic', NULL, 'userLevel', 1, 'grade', 'free', 'online', true, 'last_seen_at', d.bot_generated_at, 'is_bot', true)
          ELSE jsonb_build_object('id', ou.id, 'pseudo', COALESCE(ou.pseudo, ou.username, 'Anonyme'), 'profilePic', ou."profilePic", 'userLevel', ou."userLevel", 'grade', COALESCE(ou.grade, 'free'), 'grade_color', ou.grade_color, 'grade_color_mode', ou.grade_color_mode, 'grade_color_2', ou.grade_color_2, 'grade_color_angle', ou.grade_color_angle, 'online', (op.last_seen_at IS NOT NULL AND op.last_seen_at > NOW() - INTERVAL '90 seconds'), 'last_seen_at', op.last_seen_at, 'is_bot', false)
        END
      ) AS row_item
    FROM limited_matches d
    JOIN public.users cu ON cu.id = d.challenger_uid
    LEFT JOIN public.users ou ON ou.id = d.opponent_uid
    LEFT JOIN public.duel_match_results cr ON cr.match_id = d.id AND cr.user_id = d.challenger_uid
    LEFT JOIN public.duel_match_results orr ON orr.match_id = d.id AND orr.user_id = d.opponent_uid
    LEFT JOIN public.duel_run_states cls ON cls.match_id = d.id AND cls.user_id = d.challenger_uid
    LEFT JOIN public.duel_run_states ols ON ols.match_id = d.id AND ols.user_id = d.opponent_uid
    LEFT JOIN public.volt_presence cp ON cp.user_id = d.challenger_uid
    LEFT JOIN public.volt_presence op ON op.user_id = d.opponent_uid
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'round_number', rr.round_number,
        'challenger_score', rr.challenger_score,
        'opponent_score', rr.opponent_score,
        'winner_uid', rr.winner_uid,
        'winner_side', rr.winner_side,
        'completed_at', rr.completed_at
      ) ORDER BY rr.round_number ASC) AS rounds
      FROM public.duel_round_results rr
      WHERE rr.match_id = d.id
    ) rr ON TRUE
  ) q;

  RETURN jsonb_build_object('success', true, 'duels', v_items, 'random_queue', v_queue);
END;
$$;


--
-- Name: get_my_elo_history(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_elo_history(p_limit integer DEFAULT 20) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_limit INTEGER := LEAST(50, GREATEST(1, COALESCE(p_limit, 20)));
  v_items JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated', 'history', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', h.id,
    'duel_id', h.duel_id,
    'opponent_id', h.opponent_id,
    'opponent_pseudo', COALESCE(u.pseudo, u.username, 'Anonyme'),
    'old_elo', h.old_elo,
    'new_elo', h.new_elo,
    'elo_delta', h.elo_delta,
    'result', h.result,
    'duel_type', h.duel_type,
    'token_wager', h.token_wager,
    'reason', h.reason,
    'created_at', h.created_at
  ) ORDER BY h.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM public.elo_history h
  LEFT JOIN public.users u ON u.id = h.opponent_id
  WHERE h.user_id = v_user_id
  LIMIT v_limit;

  RETURN jsonb_build_object('success', true, 'history', v_items);
END;
$$;


--
-- Name: get_my_elo_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_elo_profile() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_elo public.player_elo%ROWTYPE;
  v_recent JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_elo FROM public.ensure_player_elo(v_user_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', h.id,
    'duel_id', h.duel_id,
    'opponent_id', h.opponent_id,
    'old_elo', h.old_elo,
    'new_elo', h.new_elo,
    'elo_delta', h.elo_delta,
    'result', h.result,
    'duel_type', h.duel_type,
    'token_wager', h.token_wager,
    'reason', h.reason,
    'created_at', h.created_at
  ) ORDER BY h.created_at DESC), '[]'::jsonb)
  INTO v_recent
  FROM public.elo_history h
  WHERE h.user_id = v_user_id
  LIMIT 8;

  RETURN jsonb_build_object(
    'success', true,
    'elo', v_elo.duel_elo,
    'global_elo', v_elo.global_elo,
    'rank', public.volt_elo_rank(v_elo.duel_elo),
    'duels_played', v_elo.duels_played,
    'wins', v_elo.wins,
    'losses', v_elo.losses,
    'draws', v_elo.draws,
    'winrate', CASE WHEN v_elo.duels_played > 0 THEN ROUND((v_elo.wins::NUMERIC / v_elo.duels_played::NUMERIC) * 100, 1) ELSE 0 END,
    'current_win_streak', v_elo.current_win_streak,
    'best_win_streak', v_elo.best_win_streak,
    'tokens_won_from_duels', v_elo.tokens_won_from_duels,
    'tokens_lost_from_duels', v_elo.tokens_lost_from_duels,
    'recent_history', v_recent
  );
END;
$$;


--
-- Name: get_my_payment_orders(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_payment_orders(p_limit integer DEFAULT 10) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_limit INTEGER := LEAST(25, GREATEST(1, COALESCE(p_limit, 10)));
  v_items JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated', 'orders', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'provider', provider,
    'product_type', product_type,
    'product_id', product_id,
    'amount_cents', amount_cents,
    'currency', currency,
    'tokens', tokens,
    'grade', grade,
    'status', status,
    'checkout_url', checkout_url,
    'created_at', created_at,
    'completed_at', completed_at
  ) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM public.payment_orders
  WHERE user_id = v_user_id
  LIMIT v_limit;

  RETURN jsonb_build_object('success', true, 'orders', v_items);
END;
$$;


--
-- Name: get_my_season_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_season_summary() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_current_season jsonb;
  v_history jsonb;
  v_my_live_rank integer;
  v_my_live_elo integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  v_current_season := (SELECT get_current_season())->'season';

  SELECT live_rank, live_elo INTO v_my_live_rank, v_my_live_elo
  FROM (
    SELECT
      pe.user_id,
      pe.duel_elo AS live_elo,
      ROW_NUMBER() OVER (ORDER BY pe.duel_elo DESC NULLS LAST, pe.wins DESC, pe.duels_played DESC)::int AS live_rank
    FROM player_elo pe
    WHERE pe.duels_played > 0
  ) t
  WHERE user_id = v_uid;

  SELECT COALESCE(jsonb_agg(row_to_json(h) ORDER BY h.season_id DESC), '[]'::jsonb) INTO v_history
  FROM (
    SELECT s.season_id, es.name AS season_name, s.final_rank, s.final_elo, s.rank_tier
    FROM elo_season_snapshots s
    JOIN elo_seasons es ON es.id = s.season_id
    WHERE s.user_id = v_uid
    ORDER BY s.season_id DESC
    LIMIT 12
  ) h;

  RETURN jsonb_build_object(
    'success', true,
    'current_season', v_current_season,
    'live_rank', v_my_live_rank,
    'live_elo', v_my_live_elo,
    'history', v_history
  );
END $$;


--
-- Name: get_my_token_transactions(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_token_transactions(p_limit integer DEFAULT 30) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_limit INTEGER := LEAST(100, GREATEST(1, COALESCE(p_limit, 30)));
  v_items JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated', 'transactions', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'amount', amount,
    'type', type,
    'description', description,
    'ref_id', ref_id,
    'created_at', created_at
  ) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT amount, type, description, ref_id, created_at
    FROM public.volt_token_transactions
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
    LIMIT v_limit
  ) t;

  RETURN jsonb_build_object('success', true, 'transactions', v_items);
END;
$$;


--
-- Name: get_my_tokens(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_tokens() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row public.volt_tokens%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  INSERT INTO public.volt_tokens(user_id, balance, total_granted)
  VALUES (v_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM public.volt_tokens WHERE user_id = v_user_id;
  RETURN jsonb_build_object(
    'success', true,
    'balance', COALESCE(v_row.balance, 0),
    'total_granted', COALESCE(v_row.total_granted, 0)
  );
END;
$$;


--
-- Name: get_public_app_settings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_app_settings() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_payload jsonb := '{}'::jsonb;
BEGIN
  -- Whitelisted keys only. Adjust as needed.
  -- Returns empty object if app_settings table missing.
  BEGIN
    SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
      INTO v_payload
      FROM app_settings
     WHERE key IN ('public_announce', 'min_client_version', 'season_id');
  EXCEPTION WHEN undefined_table THEN
    v_payload := '{}'::jsonb;
  WHEN undefined_column THEN
    v_payload := '{}'::jsonb;
  END;
  RETURN v_payload;
END $$;


--
-- Name: get_public_leaderboard(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_leaderboard(p_category text DEFAULT 'no_coin_record'::text, p_limit integer DEFAULT 100) RETURNS TABLE(id uuid, uid uuid, pseudo character varying, "profilePic" text, "userLevel" integer, "time" numeric, "updatedAt" timestamp with time zone, grade character varying, grade_color character varying, grade_color_mode text, grade_color_2 character varying, grade_color_angle integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS id,
    s.user_id AS uid,
    COALESCE(u.pseudo, u.username, 'Anonyme')::VARCHAR AS pseudo,
    u."profilePic",
    u."userLevel",
    s.time,
    COALESCE(s.created_at, u.updated_at) AS "updatedAt",
    COALESCE(u.grade, 'free')::VARCHAR AS grade,
    u.grade_color,
    u.grade_color_mode,
    u.grade_color_2,
    u.grade_color_angle
  FROM public.scores s
  LEFT JOIN public.users u ON u.id = s.user_id
  WHERE s.category = p_category
    AND COALESCE(s.status, 'valid') = 'valid'
  ORDER BY
    CASE WHEN p_category = 'speedrun' THEN s.time END ASC,
    CASE WHEN p_category <> 'speedrun' THEN s.time END DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 100);
END;
$$;


--
-- Name: get_public_profile_by_pseudo(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_profile_by_pseudo(p_pseudo text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user record;
  v_total_runs bigint := 0;
  v_record_ms  numeric := 0;
BEGIN
  -- Lookup insensible à la casse
  SELECT id, pseudo, grade, duel_elo, "profilePic", is_banned, deleted_at
  INTO v_user
  FROM public.users
  WHERE lower(trim(pseudo)) = lower(trim(p_pseudo))
  LIMIT 1;

  -- Profil inexistant, banni ou supprimé → null (aucune fuite d'info)
  IF NOT FOUND OR v_user.is_banned = true OR v_user.deleted_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  -- Stats runs (agrégées côté DB pour éviter un 2e round-trip HTTP)
  SELECT
    COUNT(*) FILTER (WHERE status = 'valid'),
    MIN(time)  FILTER (WHERE status = 'valid' AND category IN ('no_coin_record','speedrun'))
  INTO v_total_runs, v_record_ms
  FROM public.scores
  WHERE user_id = v_user.id;

  RETURN jsonb_build_object(
    'id',                v_user.id,
    'pseudo',            v_user.pseudo,
    'grade',             COALESCE(v_user.grade, 'free'),
    'elo_rating',        v_user.duel_elo,
    'profilePic',        v_user."profilePic",
    'total_runs',        COALESCE(v_total_runs, 0),
    'personal_record_ms', COALESCE(v_record_ms, 0)
  );
END;
$$;


--
-- Name: get_public_team_members(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_team_members(p_team_id uuid, p_category text DEFAULT 'no_coin_record'::text) RETURNS TABLE(user_id uuid, role text, joined_at timestamp with time zone, best_score numeric, id uuid, pseudo text, username text, "profilePic" text, "userLevel" integer, grade text, grade_badge text, grade_color text, grade_color_mode text, grade_color_2 text, grade_color_angle integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF p_team_id IS NULL THEN
    RETURN;
  END IF;

  -- Lecture autorisée seulement si la team est publique ou si l'utilisateur
  -- connecté est membre de cette team.
  IF NOT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND COALESCE((to_jsonb(t)->>'is_deleted')::BOOLEAN, FALSE) = FALSE
      AND (
        COALESCE(t.is_public, TRUE) = TRUE
        OR EXISTS (
          SELECT 1
          FROM public.team_members tm_acl
          WHERE tm_acl.team_id = t.id
            AND tm_acl.user_id = auth.uid()
        )
      )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH best AS (
    SELECT
      s.user_id,
      MAX(s.time)::NUMERIC AS best_score
    FROM public.scores s
    WHERE s.user_id IN (
      SELECT tm_ids.user_id
      FROM public.team_members tm_ids
      WHERE tm_ids.team_id = p_team_id
    )
      AND s.category = COALESCE(NULLIF(p_category, ''), 'no_coin_record')
      AND COALESCE(to_jsonb(s)->>'status', 'valid') = 'valid'
    GROUP BY s.user_id
  )
  SELECT
    tm.user_id,
    COALESCE(tm.role, 'member')::TEXT AS role,
    tm.joined_at,
    COALESCE(best.best_score, 0)::NUMERIC AS best_score,
    u.id,
    COALESCE(u.pseudo, u.username, 'Anonyme')::TEXT AS pseudo,
    u.username::TEXT,
    u."profilePic",
    u."userLevel",
    COALESCE(u.grade, 'free')::TEXT AS grade,
    u.grade_badge,
    u.grade_color,
    u.grade_color_mode,
    u.grade_color_2,
    u.grade_color_angle
  FROM public.team_members tm
  LEFT JOIN public.users u ON u.id = tm.user_id
  LEFT JOIN best ON best.user_id = tm.user_id
  WHERE tm.team_id = p_team_id
  ORDER BY
    CASE COALESCE(tm.role, 'member')
      WHEN 'owner' THEN 0
      WHEN 'officer' THEN 1
      ELSE 2
    END ASC,
    COALESCE(best.best_score, 0) DESC,
    COALESCE(u.pseudo, u.username, 'Anonyme') ASC;
END;
$$;


--
-- Name: get_referral_info(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_referral_info(p_user_id uuid) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
  SELECT json_build_object(
    'referral_code',           u.referral_code,
    'referred_by',             u.referred_by,
    'referral_credits_earned', u.referral_credits_earned,
    'referral_count',          (SELECT COUNT(*) FROM users WHERE referred_by = p_user_id),
    'is_eligible_for_referral', (u.referred_by IS NULL AND u.created_at >= NOW() - INTERVAL '48 hours')
  )
  FROM users u
  WHERE u.id = p_user_id;
$$;


--
-- Name: get_replay_events(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_replay_events(p_match_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF NOT EXISTS (
    SELECT 1 FROM duel_matches
    WHERE id = p_match_id
      AND (challenger_uid = v_uid OR opponent_uid = v_uid OR has_admin_permission('view_audit_logs'))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(e) ORDER BY e.recorded_at), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT id, user_id, kind, elapsed_ms, payload, recorded_at
    FROM duel_replay_events
    WHERE match_id = p_match_id
    ORDER BY recorded_at
    LIMIT 1000
  ) e;
  RETURN jsonb_build_object('success', true, 'events', v_rows);
END $$;


--
-- Name: get_run_calendar_year(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_run_calendar_year() RETURNS TABLE(run_day date, run_count bigint)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT
    DATE(created_at) AS run_day,
    COUNT(*)              AS run_count
  FROM run_history
  WHERE user_id = auth.uid()
    AND created_at >= NOW() - INTERVAL '365 days'
  GROUP BY DATE(created_at)
  ORDER BY run_day;
$$;


--
-- Name: get_score_nonce(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_score_nonce() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user UUID := auth.uid();
  v_nonce TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  -- 12 random bytes = 24 hex chars = 96 bits of entropy.
  v_nonce := encode(gen_random_bytes(12), 'hex');
  INSERT INTO public.score_nonces(nonce, user_id) VALUES (v_nonce, v_user);
  -- Opportunistic garbage-collection: every call expires at most 50 old rows.
  DELETE FROM public.score_nonces
    WHERE ctid IN (
      SELECT ctid FROM public.score_nonces
        WHERE expires_at < NOW() LIMIT 50
    );
  RETURN v_nonce;
END;
$$;


--
-- Name: get_season_leaderboard(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_season_leaderboard(p_season_id integer DEFAULT NULL::integer, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_season_id integer := p_season_id;
  v_rows jsonb;
  v_active_window record;
BEGIN
  IF v_season_id IS NULL THEN
    SELECT id INTO v_season_id FROM elo_seasons
     WHERE is_active = true AND now() BETWEEN starts_at AND ends_at
     ORDER BY starts_at DESC LIMIT 1;
  END IF;

  IF v_season_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'season_id', NULL, 'rows', '[]'::jsonb);
  END IF;

  -- Closed season: read snapshot.
  IF EXISTS (SELECT 1 FROM elo_seasons WHERE id = v_season_id AND closed_at IS NOT NULL) THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT
        s.user_id,
        u.pseudo,
        u.profilePic AS profile_pic,
        u.grade,
        u.grade_color,
        s.final_elo,
        s.final_rank,
        s.rank_tier,
        s.wins,
        s.losses,
        s.duels_played
      FROM elo_season_snapshots s
      JOIN users u ON u.id = s.user_id
      WHERE s.season_id = v_season_id
      ORDER BY s.final_rank
      LIMIT GREATEST(1, LEAST(p_limit, 200))
      OFFSET GREATEST(0, p_offset)
    ) t;
    RETURN jsonb_build_object('success', true, 'season_id', v_season_id, 'closed', true, 'rows', v_rows);
  END IF;

  -- Active season: read live player_elo, restricted to duels played within
  -- the season window. We compute approximate live rank from current ELO.
  SELECT starts_at, ends_at INTO v_active_window FROM elo_seasons WHERE id = v_season_id;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.live_rank), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      pe.user_id,
      u.pseudo,
      u.profilePic AS profile_pic,
      u.grade,
      u.grade_color,
      pe.duel_elo AS live_elo,
      ROW_NUMBER() OVER (ORDER BY pe.duel_elo DESC NULLS LAST, pe.wins DESC, pe.duels_played DESC)::int AS live_rank,
      volt_rank_tier(pe.duel_elo) AS rank_tier,
      pe.wins,
      pe.losses,
      pe.duels_played
    FROM player_elo pe
    JOIN users u ON u.id = pe.user_id
    WHERE pe.duels_played > 0
    ORDER BY pe.duel_elo DESC NULLS LAST
    LIMIT GREATEST(1, LEAST(p_limit, 200))
    OFFSET GREATEST(0, p_offset)
  ) t;

  RETURN jsonb_build_object('success', true, 'season_id', v_season_id, 'closed', false, 'rows', v_rows);
END $$;


--
-- Name: get_season_pass_status(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_season_pass_status(p_season_id integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_user UUID := auth.uid(); v_season INT; v_xp INT; v_progress RECORD;
BEGIN
  SELECT COALESCE(p_season_id, (SELECT id FROM seasons WHERE is_active=true LIMIT 1)::INT) INTO v_season;
  SELECT xp INTO v_xp FROM users WHERE id = v_user;
  SELECT * INTO v_progress FROM user_season_pass_progress WHERE user_id=v_user AND season_id=v_season;
  RETURN jsonb_build_object(
    'season_id', v_season,
    'user_xp', COALESCE(v_xp, 0),
    'is_premium', COALESCE(v_progress.is_premium, false),
    'claimed_nodes', COALESCE(v_progress.claimed_nodes, '{}'),
    'nodes', (SELECT jsonb_agg(row_to_json(n.*) ORDER BY n.node_order) FROM season_pass_nodes n WHERE n.season_id=v_season)
  );
END;$$;


--
-- Name: get_season_pass_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_season_pass_status(p_season_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_user UUID := auth.uid(); v_season UUID; v_xp INT; v_progress RECORD;
BEGIN
  SELECT COALESCE(p_season_id, (SELECT id FROM seasons WHERE is_active=true LIMIT 1)) INTO v_season;
  SELECT xp INTO v_xp FROM users WHERE id = v_user;
  SELECT * INTO v_progress FROM user_season_pass_progress WHERE user_id=v_user AND season_id=v_season;
  RETURN jsonb_build_object(
    'season_id', v_season,
    'user_xp', COALESCE(v_xp, 0),
    'is_premium', COALESCE(v_progress.is_premium, false),
    'claimed_nodes', COALESCE(v_progress.claimed_nodes, '{}'),
    'nodes', (SELECT jsonb_agg(row_to_json(n.*) ORDER BY n.node_order) FROM season_pass_nodes n WHERE n.season_id=v_season)
  );
END;$$;


--
-- Name: get_social_counts(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_social_counts(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_fr_count INT := 0;
  v_dm_count INT := 0;
  v_bc_count INT := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('friend_requests', 0, 'unread_dms', 0, 'recent_broadcasts', 0);
  END IF;

  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden_social_counts';
  END IF;

  SELECT count(*) INTO v_fr_count
  FROM public.friend_requests
  WHERE receiver_id = p_user_id AND status = 'pending';

  SELECT count(*) INTO v_dm_count
  FROM public.direct_messages
  WHERE to_uid = p_user_id AND COALESCE(is_read, false) = false;

  SELECT count(*) INTO v_bc_count
  FROM public.broadcasts
  WHERE created_at > (NOW() - INTERVAL '10 minutes');

  RETURN jsonb_build_object(
    'friend_requests', v_fr_count,
    'unread_dms', v_dm_count,
    'recent_broadcasts', v_bc_count
  );
END;
$$;


--
-- Name: get_spin_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_spin_status(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_last_spin TIMESTAMPTZ;
BEGIN
  SELECT spun_at INTO v_last_spin
  FROM user_spin_history
  WHERE user_id = p_user_id
  ORDER BY spun_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'available', (v_last_spin IS NULL OR v_last_spin <= NOW() - INTERVAL '7 days'),
    'next_spin_at', CASE WHEN v_last_spin IS NOT NULL THEN v_last_spin + INTERVAL '7 days' ELSE NULL END,
    'items', (SELECT json_agg(row_to_json(s) ORDER BY s.id) FROM spin_wheel_items s)
  );
END;
$$;


--
-- Name: get_team_daily_challenges(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_team_daily_challenges(p_team_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_challenges JSONB;
BEGIN
  -- Auto-generate if none for today
  IF NOT EXISTS(SELECT 1 FROM team_daily_challenges WHERE team_id=p_team_id AND expires_at=CURRENT_DATE) THEN
    INSERT INTO team_daily_challenges(team_id, challenge_type, description, target_value, reward_credits)
    VALUES
      (p_team_id, 'runs', 'Completez 10 runs en équipe aujourd''hui', 10, 50),
      (p_team_id, 'wins', 'Gagnez 3 duels en équipe aujourd''hui', 3, 75),
      (p_team_id, 'activity', 'Ayez 5 membres actifs aujourd''hui', 5, 100);
  END IF;
  SELECT jsonb_agg(row_to_json(c.*)) INTO v_challenges
  FROM team_daily_challenges c WHERE c.team_id=p_team_id AND c.expires_at=CURRENT_DATE;
  RETURN COALESCE(v_challenges, '[]'::jsonb);
END;$$;


--
-- Name: get_team_leaderboard(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_team_leaderboard(p_limit integer DEFAULT 20) RETURNS TABLE(team_id uuid, name character varying, tag character varying, icon text, member_count bigint, total_score numeric, avg_score numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.tag,
    t.icon,
    COUNT(tm.user_id)::BIGINT,
    COALESCE(SUM(s.time), 0)::NUMERIC,
    COALESCE(AVG(s.time), 0)::NUMERIC
  FROM public.teams t
  JOIN public.team_members tm ON tm.team_id = t.id
  LEFT JOIN public.scores s
    ON s.user_id = tm.user_id AND s.category = 'no_coin_record'
  GROUP BY t.id, t.name, t.tag, t.icon
  ORDER BY COALESCE(SUM(s.time), 0) DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_team_war(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_team_war(p_team_id uuid) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT row_to_json(tw)
  FROM team_wars tw
  WHERE (tw.team_a_id = p_team_id OR tw.team_b_id = p_team_id)
    AND tw.week_start = date_trunc('week', CURRENT_DATE)::DATE
    AND tw.status = 'active'
  LIMIT 1;
$$;


--
-- Name: get_unread_dm_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_dm_count() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated', 'count', 0, 'unread_dms', 0);
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.direct_messages
  WHERE to_uid = v_user_id
    AND COALESCE(is_read, false) = false;

  RETURN jsonb_build_object('success', true, 'count', v_count, 'unread_dms', v_count);
END;
$$;


--
-- Name: get_user_detailed_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_detailed_stats(target_uid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    res JSON;
BEGIN
    -- Calcul de la répartition des runs
    SELECT json_build_object(
        'total_runs', COUNT(*),
        'total_time', COALESCE(SUM(duration), 0),
        'under_5m', COUNT(*) FILTER (WHERE duration < 300),
        'm5_to_10m', COUNT(*) FILTER (WHERE duration >= 300 AND duration < 600),
        'm10_to_30m', COUNT(*) FILTER (WHERE duration >= 600 AND duration < 1800),
        'm30_to_1h', COUNT(*) FILTER (WHERE duration >= 1800 AND duration < 3600),
        'h1_to_h130', COUNT(*) FILTER (WHERE duration >= 3600 AND duration < 5400),
        'over_1h30', COUNT(*) FILTER (WHERE duration >= 5400)
    ) INTO res
    FROM public.run_history
    WHERE user_id = target_uid;

    -- Assemblage final avec la progression des 30 derniers jours
    RETURN (
        SELECT json_build_object(
            'summary', res,
            'progression', COALESCE((
                SELECT json_agg(json_build_object('day', day, 'avg', avg_dur, 'count', cnt))
                FROM (
                    SELECT created_at::DATE as day, ROUND(AVG(duration)::NUMERIC, 2) as avg_dur, COUNT(*) as cnt
                    FROM public.run_history
                    WHERE user_id = target_uid AND created_at > NOW() - INTERVAL '30 days'
                    GROUP BY day
                    ORDER BY day ASC
                ) daily
            ), '[]'::json)
        )
    );
END;
$$;


--
-- Name: get_user_percentile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_percentile(p_user_id uuid) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT ROUND(
    (COUNT(*) FILTER (WHERE duel_elo < (SELECT duel_elo FROM player_elo WHERE user_id = p_user_id))::NUMERIC
     / NULLIF(COUNT(*), 0)::NUMERIC) * 100, 1)
  FROM player_elo WHERE duel_elo IS NOT NULL AND user_id != p_user_id;
$$;


--
-- Name: get_user_progression(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_progression(target_uid uuid) RETURNS TABLE(day date, average_duration numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        created_at::DATE as day,
        ROUND(AVG(duration)::NUMERIC, 2) as average_duration
    FROM public.run_history
    WHERE user_id = target_uid
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY day
    ORDER BY day ASC;
END;
$$;


--
-- Name: get_user_xp_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_xp_profile(p_user_id uuid) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT json_build_object(
    'xp', u.xp,
    'level', u.level_cached,
    'active_title', u.active_title,
    'xp_next_level', (POWER(u.level_cached, 2) * 100),
    'unlocked_titles', (
      SELECT json_agg(json_build_object(
        'key', t.key,
        'label_fr', t.label_fr,
        'label_en', t.label_en,
        'rarity', t.rarity
      ))
      FROM user_titles ut JOIN titles t ON t.key = ut.title_key
      WHERE ut.user_id = p_user_id
    )
  )
  FROM users u WHERE u.id = p_user_id;
$$;


--
-- Name: get_volt_schema_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_volt_schema_version() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN jsonb_build_object(
    'version', 'v19.0.7',
    'admin_panel', true,
    'manual_discord_tokens', true,
    'duel_reset_fix', true,
    'duel_abandon_fix', true,
    'bot_avatar_and_live_fix', true,
    'clans_public_members_fix', true,
    'strict_pre_duel_run_guard', true,
    'duel_accept_start_race_fix', true,
    'duel_instant_live_ready', true,
    'average_based_duel_bots', true,
    'token_elo_multiplier_v2', true,
    'updated_at', NOW()
  );
END;
$$;


--
-- Name: grant_cosmetic(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grant_cosmetic(p_cosmetic_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_target UUID := v_uid;
  v_owned  jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  -- Only admins can call directly; lucky-box and reward RPCs use SECURITY DEFINER
  -- and call this function from a controlled context, where they pass a verified id.
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF p_cosmetic_id IS NULL OR length(p_cosmetic_id) = 0 OR length(p_cosmetic_id) > 80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_cosmetic_id');
  END IF;

  UPDATE public.users
     SET cosmetics_owned = CASE
           WHEN cosmetics_owned ? p_cosmetic_id THEN cosmetics_owned
           ELSE cosmetics_owned || to_jsonb(p_cosmetic_id)
         END,
         updated_at = NOW()
   WHERE id = v_target
   RETURNING cosmetics_owned INTO v_owned;

  RETURN jsonb_build_object('success', true, 'owned', v_owned);
END;
$$;


--
-- Name: grant_credits_to_user(uuid, integer, character varying, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grant_credits_to_user(p_user_id uuid, p_amount integer, p_type character varying DEFAULT 'admin_grant'::character varying, p_description text DEFAULT NULL::text, p_ref_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.users
    SET credits = GREATEST(0, credits + p_amount), updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits INTO v_new_balance;

  INSERT INTO public.volt_credit_transactions(user_id, amount, type, description, ref_id)
  VALUES (p_user_id, p_amount, p_type, p_description, p_ref_id);

  RETURN COALESCE(v_new_balance, 0);
END;
$$;


--
-- Name: grant_lucky_box(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grant_lucky_box() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  INSERT INTO public.user_lucky_boxes(user_id, count)
  VALUES (v_uid, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET count = user_lucky_boxes.count + 1, updated_at = NOW()
  RETURNING count INTO v_count;

  INSERT INTO public.volt_credit_transactions(user_id, amount, type, description)
  VALUES (v_uid, 1, 'lucky_box_grant', 'Lucky Box obtenue');

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;


--
-- Name: guard_elo_processed_flag(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_elo_processed_flag() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.elo_processed IS NOT NULL
     AND OLD.elo_processed = TRUE
     AND COALESCE(NEW.elo_processed, FALSE) = FALSE
     AND NOT is_admin() THEN
    RAISE EXCEPTION 'cannot_unprocess_elo' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_provider text := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  v_meta_pseudo text := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'pseudo', '')), '');
  v_meta_username text := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'username', '')), '');
BEGIN
  BEGIN
    INSERT INTO public.users (id, username, pseudo, email, first_name, last_name, full_name, google_avatar_url, auth_provider, last_ip)
    VALUES (
      NEW.id,
      CASE
        WHEN v_provider = 'google' AND COALESCE(v_meta_username, v_meta_pseudo) IS NULL THEN NULL
        ELSE COALESCE(v_meta_username, v_meta_pseudo, 'Membre')
      END,
      CASE
        WHEN v_provider = 'google' AND v_meta_pseudo IS NULL THEN NULL
        ELSE COALESCE(v_meta_pseudo, 'Membre')
      END,
      NEW.email,
      NEW.raw_user_meta_data->>'given_name',
      NEW.raw_user_meta_data->>'family_name',
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
      v_provider,
      NEW.raw_user_meta_data->>'last_ip'
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      pseudo = EXCLUDED.pseudo,
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      full_name = EXCLUDED.full_name,
      google_avatar_url = EXCLUDED.google_avatar_url,
      auth_provider = EXCLUDED.auth_provider,
      last_ip = EXCLUDED.last_ip,
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;


--
-- Name: handle_team_request(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_team_request(p_request_id uuid, p_status character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_req       RECORD;
  v_my_role   VARCHAR;
  v_cur_cnt   INTEGER;
  v_max       INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_status NOT IN ('accepted', 'declined') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  SELECT * INTO v_req FROM public.team_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'request_not_found'); END IF;

  -- Vérifier mes permissions dans cette team
  SELECT role INTO v_my_role FROM public.team_members 
  WHERE team_id = v_req.team_id AND user_id = v_user_id;

  IF v_my_role NOT IN ('owner', 'officer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_permissions');
  END IF;

  IF p_status = 'accepted' THEN
    -- Vérifier places
    SELECT COUNT(tm.user_id), t.max_members
    INTO v_cur_cnt, v_max
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.team_id = v_req.team_id
    GROUP BY t.max_members;

    IF v_cur_cnt >= v_max THEN
      RETURN jsonb_build_object('success', false, 'error', 'team_full');
    END IF;

    -- Ajouter membre
    INSERT INTO public.team_members(team_id, user_id, role)
    VALUES (v_req.team_id, v_req.user_id, 'member')
    ON CONFLICT (user_id) DO NOTHING;

    -- Marquer comme acceptée
    UPDATE public.team_requests SET status = 'accepted' WHERE id = p_request_id;
    
    -- Expirer/Supprimer les autres demandes/invites du user car il est maintenant dans une team
    UPDATE public.team_requests SET status = 'declined' WHERE user_id = v_req.user_id AND status = 'pending';
    UPDATE public.team_invites  SET status = 'declined' WHERE to_uid = v_req.user_id AND status = 'pending';

  ELSE
    UPDATE public.team_requests SET status = 'declined' WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: has_active_ban(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_active_ban(p_user_id uuid, p_ban_type text DEFAULT 'global'::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_type TEXT := lower(trim(COALESCE(p_ban_type, 'global')));
BEGIN
  IF p_user_id IS NULL THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_bans b
    WHERE b.user_id = p_user_id
      AND b.is_active = TRUE
      AND b.lifted_at IS NULL
      AND b.starts_at <= NOW()
      AND (b.expires_at IS NULL OR b.expires_at > NOW())
      AND (b.ban_type = v_type OR b.ban_type = 'global')
  );
END;
$$;


--
-- Name: has_admin_permission(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_admin_permission(p_permission text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_role TEXT;
  v_permissions TEXT[];
  v_perm TEXT := lower(trim(COALESCE(p_permission, '')));
BEGIN
  IF session_user IN ('postgres', 'supabase_admin') THEN
    RETURN TRUE;
  END IF;
  IF (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role') THEN
    RETURN TRUE;
  END IF;
  IF auth.uid() IS NULL OR v_perm = '' THEN
    RETURN FALSE;
  END IF;

  SELECT role, COALESCE(NULLIF(permissions, ARRAY[]::TEXT[]), public.admin_default_permissions(role))
  INTO v_role, v_permissions
  FROM public.admin_roles
  WHERE user_id = auth.uid() AND is_active = TRUE;

  IF FOUND THEN
    IF v_role = 'owner' THEN RETURN TRUE; END IF;
    IF v_perm = ANY(v_permissions) THEN RETURN TRUE; END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND COALESCE(role, '') IN ('owner','super_admin')) THEN
    RETURN TRUE;
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND COALESCE(role, '') = 'admin') THEN
    RETURN v_perm <> 'manage_admin_roles';
  END IF;

  RETURN FALSE;
END;
$$;


--
-- Name: inject_grade_into_chat(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inject_grade_into_chat() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  u RECORD;
BEGIN
  -- Reset systématique pour contrer le spoofing client (Sécurité Critique)
  NEW.user_grade              := NULL;
  NEW.user_grade_color        := NULL;
  NEW.user_grade_color_mode   := 'solid';
  NEW.user_grade_color_2      := NULL;
  NEW.user_grade_color_angle  := 90;
  NEW.user_grade_badge        := NULL;
  NEW.user_grade_rainbow      := FALSE;

  SELECT grade, grade_color, grade_color_mode, grade_color_2, grade_color_angle, grade_badge, grade_rainbow
    INTO u
  FROM public.users
  WHERE id = NEW.uid;

  -- Seulement injecter si le grade est actif via la vue sécurisée
  IF u.grade IS NOT NULL THEN
    PERFORM 1 FROM public.active_premium WHERE user_id = NEW.uid;
    IF FOUND THEN
      NEW.user_grade              := u.grade;
      NEW.user_grade_color        := u.grade_color;
      NEW.user_grade_color_mode   := u.grade_color_mode;
      NEW.user_grade_color_2      := u.grade_color_2;
      NEW.user_grade_color_angle  := u.grade_color_angle;
      NEW.user_grade_badge        := u.grade_badge;
      NEW.user_grade_rainbow      := COALESCE(u.grade_rainbow, FALSE);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: insert_my_history_score(text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.insert_my_history_score(p_category text, p_time numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id  UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  -- Only history-style append categories. PB categories MUST flow through
  -- the HMAC-signed safe_upsert_score path.
  IF p_category NOT IN ('speedrun','no_coin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'category_not_allowed');
  END IF;
  IF p_time IS NULL OR p_time <= 0 OR p_time > 86400 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_time');
  END IF;

  INSERT INTO public.scores (user_id, category, time)
  VALUES (v_uid, p_category, p_time)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;


--
-- Name: insert_my_run(numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.insert_my_run(p_duration numeric, p_status text DEFAULT 'valid'::text, p_source text DEFAULT 'user'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id  UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_duration IS NULL OR p_duration <= 0 OR p_duration > 86400 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_duration');
  END IF;
  IF p_status NOT IN ('valid','invalid','pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;
  -- 'duel' source must be set via the duel result RPC, not by the client.
  IF p_source NOT IN ('user','import') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_source');
  END IF;

  INSERT INTO public.run_history (user_id, duration, status, source)
  VALUES (v_uid, p_duration, p_status, p_source)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'rate_limit_exceeded%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;
  RAISE;
END $$;


--
-- Name: internal_grant_cosmetic(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.internal_grant_cosmetic(p_user_id uuid, p_cosmetic_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_owned jsonb;
BEGIN
  IF p_user_id IS NULL OR p_cosmetic_id IS NULL OR length(p_cosmetic_id) = 0 OR length(p_cosmetic_id) > 80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_params');
  END IF;
  UPDATE public.users
     SET cosmetics_owned = CASE
           WHEN cosmetics_owned ? p_cosmetic_id THEN cosmetics_owned
           ELSE cosmetics_owned || to_jsonb(p_cosmetic_id)
         END,
         updated_at = NOW()
   WHERE id = p_user_id
   RETURNING cosmetics_owned INTO v_owned;
  RETURN jsonb_build_object('success', true, 'owned', v_owned);
END;
$$;


--
-- Name: invite_to_team(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.invite_to_team(p_team_id uuid, p_to_uid uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id  UUID := auth.uid();
  v_role     VARCHAR;
  v_cur_cnt  INTEGER;
  v_max      INTEGER;
  v_inv_id   UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT role INTO v_role FROM public.team_members
  WHERE team_id = p_team_id AND user_id = v_user_id;

  IF v_role NOT IN ('owner', 'officer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_permissions');
  END IF;

  IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = p_to_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_already_in_team');
  END IF;

  SELECT COUNT(tm.user_id), t.max_members
  INTO v_cur_cnt, v_max
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.team_id = p_team_id
  GROUP BY t.max_members;

  IF v_cur_cnt >= v_max THEN
    RETURN jsonb_build_object('success', false, 'error', 'team_full',
      'current', v_cur_cnt, 'max', v_max);
  END IF;

  -- Expirer les invitations pending précédentes pour ce duo
  UPDATE public.team_invites
  SET status = 'expired'
  WHERE team_id = p_team_id AND to_uid = p_to_uid AND status = 'pending';

  INSERT INTO public.team_invites(team_id, from_uid, to_uid, status)
  VALUES (p_team_id, v_user_id, p_to_uid, 'pending')
  RETURNING id INTO v_inv_id;

  RETURN jsonb_build_object('success', true, 'invite_id', v_inv_id);
END;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_banned boolean;
  v_admin_active boolean;
begin
  -- SQL Editor / roles DB privilegies
  if session_user in ('postgres', 'supabase_admin', 'dashboard_user') then
    return true;
  end if;

  -- service_role
  if current_setting('role', true) = 'service_role'
     or (auth.jwt()->>'role') = 'service_role' then
    return true;
  end if;

  if v_uid is null then
    return false;
  end if;

  select role::text, coalesce(is_banned, false)
  into v_role, v_banned
  from public.users
  where id = v_uid;

  if v_banned then
    return false;
  end if;

  if v_role in ('owner', 'admin', 'super_admin') then
    return true;
  end if;

  select exists (
    select 1
    from public.admin_roles
    where user_id = v_uid
      and coalesce(is_active, true) = true
  )
  into v_admin_active;

  return coalesce(v_admin_active, false);
end;
$$;


--
-- Name: is_banned(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_banned() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  RETURN public.has_active_ban(auth.uid(), 'global')
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_banned = TRUE);
END;
$$;


--
-- Name: is_blocked_pair(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_blocked_pair(p_a uuid, p_b uuid, p_kind text DEFAULT 'duels'::text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF p_a IS NULL OR p_b IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE ((user_id = p_a AND blocked_uid = p_b)
        OR (user_id = p_b AND blocked_uid = p_a))
      AND (kind = p_kind OR kind = 'all')
      AND (expires_at IS NULL OR expires_at > now())
  );
END $$;


--
-- Name: is_email_verified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_email_verified() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_confirmed timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT email_confirmed_at INTO v_confirmed FROM auth.users WHERE id = auth.uid();
  RETURN v_confirmed IS NOT NULL;
END;
$$;


--
-- Name: is_team_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_team_member(p_team_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF p_team_id IS NULL OR p_user_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
     WHERE team_id = p_team_id AND user_id = p_user_id
  );
END $$;


--
-- Name: is_valid_pseudo(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_valid_pseudo(p_pseudo text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $_$
BEGIN
  RETURN p_pseudo IS NOT NULL
     AND length(p_pseudo) BETWEEN 3 AND 24
     AND p_pseudo ~ '^[A-Za-z0-9_]+$';
END $_$;


--
-- Name: is_version_valid(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_version_valid() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_version INT;
BEGIN
  -- 1. Autoriser les admins en direct sur Supabase
  IF session_user IN ('postgres', 'supabase_admin') THEN RETURN TRUE; END IF;

  -- 2. Récupérer la version de l'extension depuis l'entête HTTP
  BEGIN
    v_version := (current_setting('request.headers', true)::json->>'x-volt-version')::int;
  EXCEPTION WHEN OTHERS THEN
    v_version := 0;
  END;

  -- 3. Si version < 16, on bloque absolument tout
  RETURN v_version >= 16;
END;
$$;


--
-- Name: join_random_duel(character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.join_random_duel(p_mode character varying DEFAULT 'no_coin'::character varying, p_wager_credits integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN public.join_random_duel(p_mode, p_wager_credits, 1);
END;
$$;


--
-- Name: join_random_duel(character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.join_random_duel(p_mode character varying DEFAULT 'no_coin'::character varying, p_wager_credits integer DEFAULT 0, p_series_wins integer DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wager INTEGER := LEAST(10000, GREATEST(0, COALESCE(p_wager_credits, 0)));
  v_series_wins INTEGER := public.duel_clean_series_wins(p_series_wins);
  v_series_max INTEGER := public.duel_series_max_rounds(p_series_wins);
  v_existing public.duel_random_queue%ROWTYPE;
  v_existing_wager INTEGER := 0;
  v_existing_series INTEGER := 1;
  v_matcher public.duel_random_queue%ROWTYPE;
  v_match_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF public.is_banned() THEN RETURN jsonb_build_object('success', false, 'error', 'banned'); END IF;
  IF COALESCE(p_mode, 'no_coin') <> 'no_coin' THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_mode'); END IF;

  PERFORM public.expire_old_duels();
  PERFORM pg_advisory_xact_lock(hashtext('volt_random_duel_tokens_' || v_wager::text || ':bo' || v_series_wins::text));
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  IF EXISTS (
    SELECT 1 FROM public.duel_matches
    WHERE status IN ('pending', 'active')
      AND (challenger_uid = v_user_id OR opponent_uid = v_user_id)
  ) THEN
    DELETE FROM public.duel_random_queue WHERE user_id = v_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'open_duel_exists');
  END IF;

  SELECT * INTO v_existing FROM public.duel_random_queue WHERE user_id = v_user_id FOR UPDATE;
  IF FOUND THEN
    v_existing_wager := COALESCE(v_existing.wager_tokens, v_existing.wager_credits, 0);
    v_existing_series := public.duel_clean_series_wins(v_existing.series_wins_required);
    IF v_existing_wager = v_wager AND v_existing_series = v_series_wins THEN
      RETURN jsonb_build_object('success', true, 'status', 'queued', 'already_queued', true, 'wager_tokens', v_wager, 'wager_credits', v_wager, 'series_wins_required', v_series_wins, 'series_max_rounds', v_series_max);
    END IF;
    DELETE FROM public.duel_random_queue WHERE user_id = v_user_id;
    IF v_existing_wager > 0 THEN
      PERFORM public.apply_token_delta(v_user_id, v_existing_wager, 'duel_refund', 'Changement mise random 1v1', NULL);
    END IF;
  END IF;

  SELECT q.* INTO v_matcher
  FROM public.duel_random_queue q
  JOIN public.users u ON u.id = q.user_id
  WHERE q.user_id <> v_user_id
    AND q.mode = 'no_coin'
    AND COALESCE(q.wager_tokens, q.wager_credits, 0) = v_wager
    AND public.duel_clean_series_wins(q.series_wins_required) = v_series_wins
    AND COALESCE(u.is_banned, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM public.duel_matches d
      WHERE d.status IN ('pending', 'active')
        AND (d.challenger_uid = q.user_id OR d.opponent_uid = q.user_id)
    )
  ORDER BY q.created_at ASC
  LIMIT 1
  FOR UPDATE OF q SKIP LOCKED;

  PERFORM public.ensure_token_balance(v_user_id, v_wager);

  IF v_matcher.user_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_matcher.user_id::text));
    DELETE FROM public.duel_random_queue WHERE user_id IN (v_user_id, v_matcher.user_id);

    IF v_wager > 0 THEN
      PERFORM public.apply_token_delta(v_user_id, -v_wager, 'duel_escrow', 'Mise 1v1 random tokens', NULL);
    END IF;

    INSERT INTO public.duel_matches(
      challenger_uid, opponent_uid, mode, status, accepted_at, started_at, ends_at,
      wager_credits, wager_tokens, challenger_escrow, opponent_escrow, challenger_token_escrow, opponent_token_escrow,
      series_wins_required, series_max_rounds, current_round
    )
    VALUES (
      v_matcher.user_id, v_user_id, 'no_coin', 'active', NOW(), NOW(), NOW() + INTERVAL '13 hours',
      v_wager, v_wager, 0, 0, v_wager, v_wager,
      v_series_wins, v_series_max, 1
    )
    RETURNING id INTO v_match_id;

    UPDATE public.volt_token_transactions
    SET ref_id = v_match_id
    WHERE ref_id IS NULL
      AND type = 'duel_escrow'
      AND user_id IN (v_user_id, v_matcher.user_id)
      AND created_at > NOW() - INTERVAL '5 minutes';

    RETURN jsonb_build_object('success', true, 'status', 'active', 'match_id', v_match_id, 'wager_tokens', v_wager, 'wager_credits', v_wager, 'series_wins_required', v_series_wins, 'series_max_rounds', v_series_max, 'current_round', 1);
  END IF;

  IF v_wager > 0 THEN
    PERFORM public.apply_token_delta(v_user_id, -v_wager, 'duel_escrow', 'Mise 1v1 random en attente tokens', NULL);
  END IF;

  INSERT INTO public.duel_random_queue(user_id, mode, wager_credits, wager_tokens, series_wins_required, series_max_rounds)
  VALUES (v_user_id, 'no_coin', v_wager, v_wager, v_series_wins, v_series_max)
  ON CONFLICT (user_id) DO UPDATE
    SET mode = EXCLUDED.mode,
        wager_credits = EXCLUDED.wager_credits,
        wager_tokens = EXCLUDED.wager_tokens,
        series_wins_required = EXCLUDED.series_wins_required,
        series_max_rounds = EXCLUDED.series_max_rounds,
        created_at = NOW();

  RETURN jsonb_build_object('success', true, 'status', 'queued', 'wager_tokens', v_wager, 'wager_credits', v_wager, 'series_wins_required', v_series_wins, 'series_max_rounds', v_series_max);
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'insufficient_tokens' THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_tokens');
  END IF;
  RAISE;
END;
$$;


--
-- Name: join_tournament(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.join_tournament(p_tournament_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_t record;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF v_t.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF v_t.status <> 'open' THEN RETURN jsonb_build_object('success', false, 'error', 'not_open'); END IF;
  SELECT COUNT(*) INTO v_count FROM tournament_participants WHERE tournament_id = p_tournament_id;
  IF v_count >= v_t.max_players THEN RETURN jsonb_build_object('success', false, 'error', 'full'); END IF;

  IF v_t.entry_tokens > 0 THEN
    PERFORM ensure_token_balance(v_uid, v_t.entry_tokens);
    PERFORM apply_token_delta(v_uid, -v_t.entry_tokens, 'tournament_entry',
      'tournament ' || v_t.id::text, NULL);
  END IF;

  INSERT INTO tournament_participants (tournament_id, user_id, seed)
  VALUES (p_tournament_id, v_uid, v_count + 1)
  ON CONFLICT (tournament_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END $$;


--
-- Name: kick_team_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.kick_team_member(p_target_uid uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_team_id    UUID;
  v_my_role    VARCHAR;
  v_their_role VARCHAR;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT team_id, role INTO v_team_id, v_my_role
  FROM public.team_members WHERE user_id = v_user_id;

  IF v_my_role NOT IN ('owner', 'officer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_permissions');
  END IF;

  SELECT role INTO v_their_role FROM public.team_members
  WHERE team_id = v_team_id AND user_id = p_target_uid;

  IF v_their_role = 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_kick_owner');
  END IF;

  IF v_my_role = 'officer' AND v_their_role = 'officer' THEN
    RETURN jsonb_build_object('success', false, 'error', 'officers_cannot_kick_officers');
  END IF;

  DELETE FROM public.team_members WHERE user_id = p_target_uid AND team_id = v_team_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: leave_random_duel_queue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.leave_random_duel_queue() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row public.duel_random_queue%ROWTYPE;
  v_wager INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;

  SELECT * INTO v_row FROM public.duel_random_queue WHERE user_id = v_user_id FOR UPDATE;
  IF FOUND THEN
    v_wager := COALESCE(v_row.wager_tokens, v_row.wager_credits, 0);
    DELETE FROM public.duel_random_queue WHERE user_id = v_user_id;
    IF v_wager > 0 THEN
      PERFORM public.apply_token_delta(v_user_id, v_wager, 'duel_refund', 'Annulation recherche 1v1 random', NULL);
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'left', FOUND);
END;
$$;


--
-- Name: leave_team(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.leave_team() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team_id UUID;
  v_role    VARCHAR;
  v_count   INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT team_id, role INTO v_team_id, v_role
  FROM public.team_members WHERE user_id = v_user_id;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_in_team');
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.team_members WHERE team_id = v_team_id;

  IF v_role = 'owner' THEN
    IF v_count > 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'transfer_ownership_first');
    ELSE
      DELETE FROM public.teams WHERE id = v_team_id;
      RETURN jsonb_build_object('success', true, 'dissolved', true);
    END IF;
  END IF;

  DELETE FROM public.team_members WHERE user_id = v_user_id AND team_id = v_team_id;
  RETURN jsonb_build_object('success', true, 'dissolved', false);
END;
$$;


--
-- Name: link_payment_checkout_session(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_payment_checkout_session(p_order_id uuid, p_provider_session_id text, p_checkout_url text, p_provider text DEFAULT 'stripe'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_order public.payment_orders%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  IF p_order_id IS NULL OR COALESCE(p_provider_session_id, '') = '' OR COALESCE(p_checkout_url, '') = '' THEN
    RAISE EXCEPTION 'invalid_checkout_session';
  END IF;

  UPDATE public.payment_orders
  SET provider = lower(trim(COALESCE(p_provider, provider))),
      provider_session_id = p_provider_session_id,
      checkout_url = p_checkout_url,
      status = CASE WHEN status='pending' THEN 'checkout_created' ELSE status END,
      updated_at = NOW()
  WHERE id = p_order_id AND status IN ('pending','checkout_created')
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_order_not_found_or_locked';
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'checkout_url', v_order.checkout_url, 'status', v_order.status);
END;
$$;


--
-- Name: list_friend_active_duels(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.list_friend_active_duels() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  WITH friend_ids AS (
    SELECT friend_id AS uid FROM friends WHERE user_id = v_uid
    UNION
    SELECT user_id AS uid FROM friends WHERE friend_id = v_uid
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'match_id', m.id,
    'status', m.status,
    'challenger_uid', m.challenger_uid,
    'opponent_uid', m.opponent_uid,
    'started_at', m.started_at
  )), '[]'::jsonb) INTO v_rows
  FROM duel_matches m
  WHERE m.status = 'active'
    AND (m.challenger_uid IN (SELECT uid FROM friend_ids)
      OR m.opponent_uid IN (SELECT uid FROM friend_ids))
  LIMIT 50;
  RETURN jsonb_build_object('success', true, 'rows', v_rows);
END $$;


--
-- Name: list_open_tournaments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.list_open_tournaments() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_rows jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.starts_at DESC), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT id, name, format, status, entry_tokens, prize_tokens, max_players,
           starts_at, created_at,
           (SELECT COUNT(*) FROM tournament_participants p WHERE p.tournament_id = tournaments.id) AS players_joined
    FROM tournaments
    WHERE status IN ('open','in_progress')
    ORDER BY starts_at DESC
    LIMIT 25
  ) t;
  RETURN jsonb_build_object('success', true, 'rows', v_rows);
END $$;


--
-- Name: lock_hwid_on_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lock_hwid_on_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Si l'ancien HWID est non-null et différent du nouveau, et que l'utilisateur n'est pas admin, on bloque.
  IF OLD.hwid IS NOT NULL AND NEW.hwid IS DISTINCT FROM OLD.hwid THEN
    IF NOT public.is_admin() THEN
      NEW.hwid = OLD.hwid; -- Ignore la tentative de changement du HWID par le client
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: log_admin_action(text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_admin_action(p_action_type text, p_target_user_id uuid, p_details jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO moderation_log(admin_id, action_type, target_user_id, details)
    VALUES(auth.uid(), p_action_type, p_target_user_id, p_details);
END;$$;


--
-- Name: log_client_error_batch(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_client_error_batch(p_events jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int := 0;
  v_event jsonb;
BEGIN
  IF p_events IS NULL OR jsonb_typeof(p_events) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_payload');
  END IF;

  FOR v_event IN SELECT * FROM jsonb_array_elements(p_events) LIMIT 50 LOOP
    INSERT INTO client_error_logs (user_id, client_version, kind, message, context)
    VALUES (
      v_uid,
      LEFT(COALESCE(v_event->>'client_version', ''), 32),
      LEFT(COALESCE(v_event->>'kind', 'unknown'), 64),
      LEFT(COALESCE(v_event->>'message', ''), 1000),
      COALESCE(v_event->'context', '{}'::jsonb)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'inserted', v_count);
END $$;


--
-- Name: mark_my_dms_read(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_my_dms_read(p_chat_id text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_updated INTEGER := 0;
  v_left INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated', 'updated', 0, 'unread_left', 0);
  END IF;

  UPDATE public.direct_messages
  SET is_read = true
  WHERE to_uid = v_user_id
    AND COALESCE(is_read, false) = false
    AND (p_chat_id IS NULL OR chat_id = p_chat_id);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  SELECT COUNT(*) INTO v_left
  FROM public.direct_messages
  WHERE to_uid = v_user_id
    AND COALESCE(is_read, false) = false;

  RETURN jsonb_build_object('success', true, 'updated', v_updated, 'unread_left', v_left, 'count', v_left);
END;
$$;


--
-- Name: open_loot_box(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.open_loot_box(p_box_type text DEFAULT 'standard'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_box loot_box_catalog%ROWTYPE;
  v_balance integer;
  v_rewards jsonb;
  v_roll numeric;
  v_cumulative numeric := 0;
  v_reward jsonb;
  v_new_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_logged_in');
  END IF;

  SELECT * INTO v_box FROM loot_box_catalog WHERE id = p_box_type AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'box_not_found');
  END IF;

  SELECT COALESCE(credits, 0) INTO v_balance FROM users WHERE id = v_user_id;
  IF v_balance < v_box.cost_credits THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits', 'balance', v_balance, 'required', v_box.cost_credits);
  END IF;

  v_rewards := v_box.rewards;
  v_roll := random() * 100;
  FOR i IN 0..(jsonb_array_length(v_rewards) - 1) LOOP
    v_cumulative := v_cumulative + (v_rewards->i->>'weight')::numeric;
    IF v_roll <= v_cumulative THEN
      v_reward := v_rewards->i;
      EXIT;
    END IF;
  END LOOP;
  IF v_reward IS NULL THEN v_reward := v_rewards->0; END IF;

  UPDATE users
    SET credits = credits - v_box.cost_credits, updated_at = NOW()
    WHERE id = v_user_id;

  INSERT INTO volt_credit_transactions (user_id, amount, type, description)
    VALUES (v_user_id, -v_box.cost_credits, 'admin_grant', 'Achat loot box: ' || v_box.name);

  IF v_reward->>'type' = 'credits' THEN
    UPDATE users
      SET credits = credits + (v_reward->>'value')::integer, updated_at = NOW()
      WHERE id = v_user_id
      RETURNING credits INTO v_new_balance;

    INSERT INTO volt_credit_transactions (user_id, amount, type, description)
      VALUES (v_user_id, (v_reward->>'value')::integer, 'gift', 'Récompense loot box: ' || (v_reward->>'value') || ' crédits');
  END IF;

  INSERT INTO user_loot_boxes (user_id, box_type, reward_type, reward_value, credits_spent)
    VALUES (v_user_id, p_box_type, v_reward->>'type', v_reward, v_box.cost_credits);

  SELECT COALESCE(credits, 0) INTO v_new_balance FROM users WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'reward', v_reward,
    'box_name', v_box.name,
    'new_balance', v_new_balance
  );
END;
$$;


--
-- Name: open_lucky_box(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.open_lucky_box() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_count      INTEGER;
  v_roll       FLOAT;
  v_rtype      TEXT;
  v_rvalue     INTEGER := 0;
  v_rlabel     TEXT;
  v_ricon      TEXT;
  v_cosmetic   TEXT := NULL;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Lock the box-counter row so two concurrent calls cannot both pass the check
  SELECT count INTO v_count FROM public.user_lucky_boxes WHERE user_id = v_uid FOR UPDATE;
  IF v_count IS NULL OR v_count <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_lucky_boxes');
  END IF;

  -- Decrement first, atomically
  UPDATE public.user_lucky_boxes
    SET count = count - 1, updated_at = NOW()
    WHERE user_id = v_uid;

  INSERT INTO public.volt_credit_transactions(user_id, amount, type, description)
  VALUES (v_uid, -1, 'lucky_box_use', 'Lucky Box ouverte');

  -- Crypto-quality roll (replaces random())
  v_roll := (get_byte(gen_random_bytes(4), 0) * 16777216
             + get_byte(gen_random_bytes(4), 0) * 65536
             + get_byte(gen_random_bytes(4), 0) * 256
             + get_byte(gen_random_bytes(4), 0))::float / 4294967296;

  IF v_roll < 0.35 THEN
    v_rtype    := 'credits';
    v_rvalue   := 750;
    v_rlabel   := '+750 crédits !';
    v_ricon    := '💰';
    PERFORM public.grant_credits_to_user(v_uid, 750, 'lucky_box_reward', 'Récompense Lucky Box');
  ELSIF v_roll < 0.55 THEN
    v_rtype    := 'cosmetic';
    v_rlabel   := 'Thème Dark Matter débloqué !';
    v_ricon    := '🌌';
    v_cosmetic := 'theme-dark-matter';
    PERFORM public.internal_grant_cosmetic(v_uid, v_cosmetic);
  ELSIF v_roll < 0.70 THEN
    v_rtype    := 'cosmetic';
    v_rlabel   := 'Thème Aurora débloqué !';
    v_ricon    := '🌈';
    v_cosmetic := 'theme-aurora';
    PERFORM public.internal_grant_cosmetic(v_uid, v_cosmetic);
  ELSIF v_roll < 0.85 THEN
    v_rtype    := 'cosmetic';
    v_rlabel   := 'Thème Blood Moon débloqué !';
    v_ricon    := '🌑';
    v_cosmetic := 'theme-blood-moon';
    PERFORM public.internal_grant_cosmetic(v_uid, v_cosmetic);
  ELSE
    v_rtype    := 'cosmetic';
    v_rlabel   := 'Bordure Arc-en-ciel débloquée !';
    v_ricon    := '🌈';
    v_cosmetic := 'border-rainbow';
    PERFORM public.internal_grant_cosmetic(v_uid, v_cosmetic);
  END IF;

  RETURN jsonb_build_object(
    'success',      true,
    'reward_type',  v_rtype,
    'reward_value', v_rvalue,
    'reward_label', v_rlabel,
    'reward_icon',  v_ricon,
    'cosmetic_id',  v_cosmetic
  );
END;
$$;


--
-- Name: prestige_reset(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prestige_reset() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_user UUID := auth.uid(); v_level INT; v_prestige INT;
BEGIN
  SELECT level_cached, prestige_level INTO v_level, v_prestige FROM users WHERE id = v_user;
  IF COALESCE(v_level, 0) < 50 THEN RAISE EXCEPTION 'level_too_low'; END IF;
  UPDATE users SET xp = 0, level_cached = 1, prestige_level = COALESCE(v_prestige, 0) + 1 WHERE id = v_user;
  IF COALESCE(v_prestige, 0) = 0 THEN
    INSERT INTO user_titles(user_id, title_key, unlocked_at)
      VALUES (v_user, 'prestige', now()) ON CONFLICT DO NOTHING;
  END IF;
  RETURN jsonb_build_object('success', true, 'prestige_level', COALESCE(v_prestige, 0) + 1);
END;
$$;


--
-- Name: prevent_role_escalation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_role_escalation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
      DECLARE
        v_is_authorized boolean;
      BEGIN
        v_is_authorized :=
          (current_setting('role', true) IN ('postgres', 'supabase_admin', 'service_role'))
          OR (auth.jwt()->>'role' = 'service_role')
          OR public.is_admin();

        IF NOT v_is_authorized THEN
          IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'SECURITY BREACH: role cannot be modified directly';
          END IF;
          IF NEW.grade IS DISTINCT FROM OLD.grade THEN
            RAISE EXCEPTION 'SECURITY BREACH: grade is server-managed';
          END IF;
          IF NEW.grade_color IS DISTINCT FROM OLD.grade_color
             OR NEW.grade_color_mode IS DISTINCT FROM OLD.grade_color_mode
             OR NEW.grade_color_2 IS DISTINCT FROM OLD.grade_color_2
             OR NEW.grade_color_angle IS DISTINCT FROM OLD.grade_color_angle THEN
            -- grade colors editable only with premium grade; trust client only for those
            IF NEW.grade IS NULL OR NEW.grade = 'standard' THEN
              RAISE EXCEPTION 'SECURITY BREACH: grade colors require premium grade';
            END IF;
          END IF;
          IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
            RAISE EXCEPTION 'SECURITY BREACH: ban status is server-managed';
          END IF;
          IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'SECURITY BREACH: email cannot be modified directly';
          END IF;
          IF NEW."userLevel" IS DISTINCT FROM OLD."userLevel" THEN
            RAISE EXCEPTION 'SECURITY BREACH: userLevel is server-managed';
          END IF;
          IF NEW.xp IS DISTINCT FROM OLD.xp THEN
            RAISE EXCEPTION 'SECURITY BREACH: xp is server-managed';
          END IF;
          -- NEW: economy + cosmetics columns must go through RPCs only
          IF NEW.credits IS DISTINCT FROM OLD.credits THEN
            RAISE EXCEPTION 'SECURITY BREACH: credits must be modified via spend_credits/grant_credits_to_user';
          END IF;
          IF NEW.cosmetics_owned IS DISTINCT FROM OLD.cosmetics_owned THEN
            RAISE EXCEPTION 'SECURITY BREACH: cosmetics_owned must be modified via purchase_cosmetic/grant_cosmetic';
          END IF;
          IF NEW.cosmetics_active IS DISTINCT FROM OLD.cosmetics_active THEN
            RAISE EXCEPTION 'SECURITY BREACH: cosmetics_active must be modified via set_active_cosmetic';
          END IF;
          IF NEW.referral_credits_earned IS DISTINCT FROM OLD.referral_credits_earned THEN
            RAISE EXCEPTION 'SECURITY BREACH: referral_credits_earned is server-managed';
          END IF;
          IF NEW.pseudo_change_count IS DISTINCT FROM OLD.pseudo_change_count THEN
            RAISE EXCEPTION 'SECURITY BREACH: pseudo_change_count is server-managed';
          END IF;
          IF NEW.suspicion_score IS DISTINCT FROM OLD.suspicion_score THEN
            RAISE EXCEPTION 'SECURITY BREACH: suspicion_score is server-managed';
          END IF;
          IF NEW.deletion_requested_at IS DISTINCT FROM OLD.deletion_requested_at
             OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
            RAISE EXCEPTION 'SECURITY BREACH: deletion fields must use request_account_deletion/cancel_account_deletion';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$;


--
-- Name: purchase_cosmetic(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purchase_cosmetic(p_cosmetic_id text, p_cost integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_balance      INTEGER;
  v_new_balance  INTEGER;
  v_owned        jsonb;
  v_server_cost  INTEGER;
  v_is_free      BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_cosmetic_id IS NULL OR length(p_cosmetic_id) = 0 OR length(p_cosmetic_id) > 80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_cosmetic_id');
  END IF;

  SELECT cost, is_free INTO v_server_cost, v_is_free
    FROM public.cosmetics_catalog
    WHERE cosmetic_id = p_cosmetic_id;

  IF v_server_cost IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_cosmetic');
  END IF;

  -- Lock both wallet sources (C5 fix) atomically with users row.
  SELECT COALESCE(credits, 0), COALESCE(cosmetics_owned, '[]'::jsonb)
    INTO v_balance, v_owned
    FROM public.users
    WHERE id = v_uid
    FOR UPDATE;

  IF v_owned ? p_cosmetic_id THEN
    RETURN jsonb_build_object(
      'success',       true,
      'already_owned', true,
      'balance',       v_balance,
      'owned',         v_owned
    );
  END IF;

  IF NOT v_is_free AND v_balance < v_server_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits', 'balance', v_balance);
  END IF;

  -- Atomic: deduct credits (users.credits AND volt_credits.balance), add ownership, log txn.
  IF v_server_cost > 0 AND NOT v_is_free THEN
    UPDATE public.users
       SET credits         = credits - v_server_cost,
           cosmetics_owned = cosmetics_owned || to_jsonb(p_cosmetic_id),
           updated_at      = NOW()
     WHERE id = v_uid
     RETURNING credits, cosmetics_owned INTO v_new_balance, v_owned;

    -- Mirror to volt_credits (canonical wallet — fixes C5)
    INSERT INTO public.volt_credits(user_id, balance)
    VALUES (v_uid, GREATEST(0, v_new_balance))
    ON CONFLICT (user_id) DO UPDATE SET balance = GREATEST(0, v_new_balance), updated_at = NOW();

    INSERT INTO public.volt_credit_transactions(user_id, amount, type, description)
    VALUES (v_uid, -v_server_cost, 'cosmetic_purchase', 'Cosmétique: ' || p_cosmetic_id);
  ELSE
    UPDATE public.users
       SET cosmetics_owned = cosmetics_owned || to_jsonb(p_cosmetic_id),
           updated_at      = NOW()
     WHERE id = v_uid
     RETURNING credits, cosmetics_owned INTO v_new_balance, v_owned;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'owned',   v_owned
  );
END;
$$;


--
-- Name: purge_old_activity_feed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purge_old_activity_feed() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_deleted integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'permission_denied'; END IF;
  DELETE FROM public.activity_feed WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


--
-- Name: purge_old_audit_logs(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purge_old_audit_logs(p_retention_days integer DEFAULT 90) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  DELETE FROM public.admin_audit_logs
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


--
-- Name: record_duel_result(numeric, uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_duel_result(p_score numeric, p_match_id uuid, p_run_started_at timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_match        RECORD;
  v_state        RECORD;
  v_existing     numeric;
  v_now          timestamptz := NOW();
  v_server_elapsed numeric;
  v_max_allowed  numeric;
  v_clean_score  numeric;
  v_grace_sec    constant numeric := 3;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_score IS NULL OR p_score <= 0 OR p_score > 86400 THEN
    RAISE EXCEPTION 'invalid_score';
  END IF;

  PERFORM public.expire_old_duels();

  -- Lock match row
  SELECT * INTO v_match FROM public.duel_matches
   WHERE id = p_match_id
     AND (challenger_uid = v_uid OR opponent_uid = v_uid)
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;
  IF v_match.status <> 'active' THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'match_not_active', 'status', v_match.status);
  END IF;

  -- Require live state — no client fallback (closes the forge-run-start bypass)
  SELECT * INTO v_state FROM public.duel_run_states
   WHERE match_id = p_match_id AND user_id = v_uid
   FOR UPDATE;
  IF NOT FOUND OR v_state.run_started_at IS NULL THEN
    RAISE EXCEPTION 'verified_game_start_required';
  END IF;
  IF v_state.state = 'finished' THEN
    -- Idempotent: result already submitted
    SELECT score INTO v_existing FROM public.duel_match_results
      WHERE match_id = p_match_id AND user_id = v_uid;
    RETURN jsonb_build_object('success', true, 'recorded', false,
      'reason', 'already_submitted', 'score', v_existing);
  END IF;

  -- Server-elapsed (authoritative, ignores client p_run_started_at)
  v_server_elapsed := EXTRACT(EPOCH FROM (v_now - v_state.run_started_at));
  IF v_server_elapsed < 0 THEN v_server_elapsed := 0; END IF;

  -- Cap: human matches use server_elapsed + grace; bot matches use
  --      bot_score + 30s (prevents 13h AFK win against 5min bot).
  IF COALESCE(v_match.is_bot_match, false) THEN
    v_max_allowed := LEAST(86400, COALESCE(v_match.bot_score, 3600) + 30);
  ELSE
    v_max_allowed := LEAST(86400, v_server_elapsed + v_grace_sec);
  END IF;

  IF p_score > v_max_allowed THEN
    RAISE EXCEPTION 'score_exceeds_cap' USING DETAIL = format('max=%s submitted=%s', v_max_allowed, p_score);
  END IF;

  v_clean_score := LEAST(p_score, v_max_allowed);

  -- Insert result (unique on (match_id, user_id))
  INSERT INTO public.duel_match_results (match_id, user_id, score)
  VALUES (p_match_id, v_uid, v_clean_score)
  ON CONFLICT (match_id, user_id) DO NOTHING;

  -- Mark caller's run finished + bump elapsed monotonically
  UPDATE public.duel_run_states
     SET state = 'finished',
         elapsed_ms = GREATEST(elapsed_ms, ROUND(v_clean_score * 1000)::integer),
         last_seen_at = v_now,
         updated_at = v_now
   WHERE match_id = p_match_id AND user_id = v_uid;

  -- Finalize
  PERFORM public.finalize_duel_from_live_states(p_match_id);

  RETURN jsonb_build_object('success', true, 'recorded', true, 'score', v_clean_score);
END $$;


--
-- Name: record_my_last_ip(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_my_last_ip() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_ip TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_ip := public.get_client_ip();
  IF v_ip IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.users
  SET last_ip = v_ip,
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN v_ip;
END;
$$;


--
-- Name: record_profile_view(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_profile_view(p_profile_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_viewer uuid := auth.uid();
  v_count int;
BEGIN
  IF v_viewer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF p_profile_id IS NULL OR p_profile_id = v_viewer THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_target');
  END IF;
  -- Skip if same viewer logged a view today
  IF EXISTS (SELECT 1 FROM public.profile_views
             WHERE profile_id = p_profile_id AND viewer_id = v_viewer
               AND viewed_at > now() - interval '24 hours') THEN
    SELECT profile_views_count INTO v_count FROM public.users WHERE id = p_profile_id;
    RETURN jsonb_build_object('success', true, 'count', COALESCE(v_count, 0), 'deduped', true);
  END IF;
  INSERT INTO public.profile_views (profile_id, viewer_id) VALUES (p_profile_id, v_viewer);
  UPDATE public.users SET profile_views_count = COALESCE(profile_views_count, 0) + 1
    WHERE id = p_profile_id RETURNING profile_views_count INTO v_count;
  RETURN jsonb_build_object('success', true, 'count', v_count);
END $$;


--
-- Name: refund_duel_escrow(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refund_duel_escrow(p_match_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_match public.duel_matches%ROWTYPE;
BEGIN
  SELECT * INTO v_match FROM public.duel_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF COALESCE(v_match.challenger_token_escrow, 0) > 0 THEN
    PERFORM public.apply_token_delta(v_match.challenger_uid, v_match.challenger_token_escrow, 'duel_refund', 'Remboursement 1v1 tokens', v_match.id);
  END IF;
  IF COALESCE(v_match.opponent_token_escrow, 0) > 0 THEN
    PERFORM public.apply_token_delta(v_match.opponent_uid, v_match.opponent_token_escrow, 'duel_refund', 'Remboursement 1v1 tokens', v_match.id);
  END IF;

  UPDATE public.duel_matches
  SET challenger_token_escrow = 0,
      opponent_token_escrow = 0,
      challenger_escrow = 0,
      opponent_escrow = 0
  WHERE id = p_match_id;
END;
$$;


--
-- Name: request_account_deletion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_account_deletion() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  UPDATE public.users SET deleted_at = now() WHERE id = v_user_id;
  RETURN jsonb_build_object(
    'success', true,
    'restorable_until', (now() + interval '30 days')::text
  );
END $$;


--
-- Name: request_account_deletion(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_account_deletion(p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$ DECLARE v_uid UUID := auth.uid(); BEGIN IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF; UPDATE public.users SET deletion_requested_at = NOW(), updated_at = NOW() WHERE id = v_uid; RETURN jsonb_build_object('success', true, 'scheduled_at', NOW(), 'grace_days', 30); END $$;


--
-- Name: request_to_join_team(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_to_join_team(p_team_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_public BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF public.is_banned() THEN RAISE EXCEPTION 'account_banned'; END IF;

  -- Déjà dans une team ?
  IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_in_team');
  END IF;

  SELECT is_public INTO v_is_public FROM public.teams WHERE id = p_team_id;
  IF v_is_public IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'team_not_found');
  END IF;
  IF v_is_public IS FALSE THEN
    RETURN jsonb_build_object('success', false, 'error', 'team_is_private');
  END IF;

  INSERT INTO public.team_requests(team_id, user_id, status)
  VALUES (p_team_id, v_user_id, 'pending')
  ON CONFLICT (team_id, user_id) DO UPDATE SET status = 'pending', created_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: respond_duel(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.respond_duel(p_match_id uuid, p_accept boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match public.duel_matches%ROWTYPE;
  v_wager INTEGER;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF public.is_banned() THEN RETURN jsonb_build_object('success', false, 'error', 'banned'); END IF;

  PERFORM public.expire_old_duels();

  SELECT * INTO v_match FROM public.duel_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND OR v_match.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'match_not_found'); END IF;
  IF v_match.opponent_uid <> v_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_duel_opponent'); END IF;
  IF v_match.expires_at < v_now THEN
    PERFORM public.refund_duel_escrow(v_match.id);
    UPDATE public.duel_matches SET status = 'expired', completed_at = v_now WHERE id = p_match_id;
    RETURN jsonb_build_object('success', false, 'error', 'duel_expired');
  END IF;

  IF NOT p_accept THEN
    PERFORM public.refund_duel_escrow(v_match.id);
    UPDATE public.duel_matches SET status = 'declined', completed_at = v_now WHERE id = p_match_id;
    RETURN jsonb_build_object('success', true, 'status', 'declined', 'match_id', p_match_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.duel_matches
    WHERE id <> p_match_id
      AND status IN ('pending','active')
      AND (challenger_uid IN (v_match.challenger_uid, v_match.opponent_uid) OR opponent_uid IN (v_match.challenger_uid, v_match.opponent_uid))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'open_duel_exists');
  END IF;

  DELETE FROM public.duel_random_queue WHERE user_id IN (v_match.challenger_uid, v_match.opponent_uid);

  v_wager := COALESCE(v_match.wager_tokens, v_match.wager_credits, 0);
  PERFORM public.ensure_token_balance(v_user_id, v_wager);
  IF v_wager > 0 THEN
    PERFORM public.apply_token_delta(v_user_id, -v_wager, 'duel_escrow', 'Mise 1v1 tokens', p_match_id);
  END IF;

  UPDATE public.duel_matches
  SET status = 'active',
      accepted_at = v_now,
      started_at = v_now,
      ends_at = v_now + INTERVAL '13 hours',
      opponent_token_escrow = v_wager,
      opponent_escrow = 0,
      series_wins_required = public.duel_clean_series_wins(series_wins_required),
      series_max_rounds = public.duel_series_max_rounds(series_wins_required),
      current_round = GREATEST(1, current_round)
  WHERE id = p_match_id
  RETURNING * INTO v_match;

  INSERT INTO public.duel_run_states(match_id, user_id, state, elapsed_ms, run_started_at, last_seen_at, updated_at)
  VALUES
    (p_match_id, v_match.challenger_uid, 'idle', 0, NULL, v_now, v_now),
    (p_match_id, v_match.opponent_uid, 'idle', 0, NULL, v_now, v_now)
  ON CONFLICT (match_id, user_id) DO UPDATE
    SET last_seen_at = EXCLUDED.last_seen_at,
        updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object('success', true, 'status', 'active', 'match_id', p_match_id, 'wager_tokens', v_wager, 'wager_credits', v_wager, 'live_ready', true, 'series_wins_required', v_match.series_wins_required, 'series_max_rounds', v_match.series_max_rounds, 'current_round', v_match.current_round);
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'insufficient_tokens' THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_tokens');
  END IF;
  RAISE;
END;
$$;


--
-- Name: revoke_grade(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revoke_grade(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Sécurité : Autoriser l'admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : privilèges insuffisants.';
  END IF;

  UPDATE public.premium_subscriptions
  SET is_active = FALSE
  WHERE user_id = p_user_id AND is_active = TRUE;

  UPDATE public.users
  SET
    grade            = NULL,
    grade_expires_at = NULL,
    grade_badge      = NULL,
    grade_color      = NULL,
    grade_rainbow    = FALSE,
    grade_title      = NULL,
    grade_frame      = NULL,
    updated_at       = NOW()
  WHERE id = p_user_id;
END;
$$;


--
-- Name: reward_valid_reporter(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reward_valid_reporter(p_reporter_id uuid, p_xp integer DEFAULT 50, p_credits integer DEFAULT 25) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_required'; END IF;
  PERFORM add_user_xp(p_reporter_id, p_xp);
  UPDATE users SET credits = COALESCE(credits, 0) + p_credits WHERE id = p_reporter_id;
  RETURN jsonb_build_object('success', true, 'xp_awarded', p_xp, 'credits_awarded', p_credits);
END;
$$;


--
-- Name: rotate_my_hmac_secret(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rotate_my_hmac_secret() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user UUID := auth.uid();
  v_secret TEXT;
  v_last_rotated TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  -- AUDIT W3.7: cap to 1 rotation per minute to prevent self-DoS on a
  -- compromised account that spams the RPC to invalidate its own key.
  SELECT rotated_at INTO v_last_rotated
    FROM public.user_hmac_secrets WHERE user_id = v_user;
  IF v_last_rotated IS NOT NULL AND v_last_rotated > NOW() - INTERVAL '60 seconds' THEN
    RAISE EXCEPTION 'rotate_rate_limited';
  END IF;
  v_secret := encode(gen_random_bytes(32), 'base64');
  INSERT INTO public.user_hmac_secrets(user_id, secret_b64)
  VALUES (v_user, v_secret)
  ON CONFLICT (user_id) DO UPDATE
    SET secret_b64 = EXCLUDED.secret_b64, rotated_at = NOW();
  -- AUDIT W1.4: prefix the encoded form so the client can unambiguously
  -- distinguish base64 from legacy 64-char hex (those byte strings overlap
  -- for short secrets composed of [0-9a-f]).
  RETURN 'b64:' || v_secret;
END;
$$;


--
-- Name: safe_upsert_score(text, numeric, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.safe_upsert_score(p_category text, p_time numeric, p_uid uuid, p_client_sig text, p_signed_payload text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
DECLARE
  v_uid UUID := auth.uid();
  v_nonce text;
  v_nonce_row record;
  v_secret_b64 text;
  v_expected_sig text;
  v_expected_prefix text;
  v_strict_nonce boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF v_uid IS DISTINCT FROM p_uid THEN
    RAISE EXCEPTION 'uid_mismatch';
  END IF;
  IF p_time IS NULL OR p_time <= 0 OR p_time > 86400 THEN
    RAISE EXCEPTION 'invalid_time';
  END IF;
  IF p_category IS NULL OR length(p_category) > 64 THEN
    RAISE EXCEPTION 'invalid_category';
  END IF;
  IF p_client_sig IS NULL OR length(p_client_sig) > 200 THEN
    RAISE EXCEPTION 'missing_signature';
  END IF;
  IF p_signed_payload IS NULL OR length(p_signed_payload) < 20 OR length(p_signed_payload) > 500 THEN
    RAISE EXCEPTION 'invalid_signed_payload_length';
  END IF;

  v_expected_prefix := substring(p_uid::text from 1 for 8);
  IF position(v_expected_prefix in p_signed_payload) = 0 THEN
    RAISE EXCEPTION 'signed_payload_user_mismatch';
  END IF;

  SELECT COALESCE((feature_flags->>'score_nonce_required')::boolean, true)
    INTO v_strict_nonce
    FROM public.app_settings
    WHERE key = 'feature_flags'
    LIMIT 1;

  v_nonce := substring(p_signed_payload FROM '[0-9a-f]{24}$');
  IF v_nonce IS NULL THEN
    IF COALESCE(v_strict_nonce, true) THEN
      RAISE EXCEPTION 'nonce_required';
    END IF;
  ELSE
    SELECT * INTO v_nonce_row FROM public.score_nonces
      WHERE nonce = v_nonce FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_or_expired_nonce';
    END IF;
    IF v_nonce_row.user_id IS DISTINCT FROM p_uid THEN
      RAISE EXCEPTION 'nonce_user_mismatch';
    END IF;
    IF v_nonce_row.expires_at < NOW() THEN
      DELETE FROM public.score_nonces WHERE nonce = v_nonce;
      RAISE EXCEPTION 'invalid_or_expired_nonce';
    END IF;
    DELETE FROM public.score_nonces WHERE nonce = v_nonce;
  END IF;

  SELECT secret_b64 INTO v_secret_b64
  FROM public.user_hmac_secrets
  WHERE user_id = p_uid;

  IF v_secret_b64 IS NULL THEN
    RAISE EXCEPTION 'no_provisioned_secret';
  END IF;

  IF position('b64:' in v_secret_b64) = 1 THEN
    v_secret_b64 := substring(v_secret_b64 from 5);
  END IF;
  v_expected_sig := encode(
    hmac(convert_to(p_signed_payload, 'UTF8'), decode(v_secret_b64, 'base64'), 'sha256'),
    'base64'
  );
  IF v_expected_sig IS DISTINCT FROM p_client_sig THEN
    RAISE EXCEPTION 'hmac_signature_mismatch';
  END IF;

  INSERT INTO public.score_signatures(user_id, category, time, client_sig, signed_payload)
  VALUES (p_uid, p_category, p_time, p_client_sig, p_signed_payload);

  INSERT INTO public.scores (category, time, user_id)
  VALUES (p_category, p_time, p_uid)
  ON CONFLICT (user_id, category) DO UPDATE
    SET time = LEAST(EXCLUDED.time, public.scores.time);

  RETURN jsonb_build_object('success', true);
END;
$_$;


--
-- Name: search_profiles_by_pseudo(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_profiles_by_pseudo(p_query text, p_limit integer DEFAULT 5) RETURNS TABLE(id uuid, pseudo text, grade text, "profilePic" text, duel_elo integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT
    u.id,
    u.pseudo,
    u.grade,
    u."profilePic",
    COALESCE(u.duel_elo, 1000)::int
  FROM public.users u
  WHERE u.pseudo IS NOT NULL
    AND length(trim(u.pseudo)) > 0
    AND (
      p_query IS NULL
      OR length(trim(p_query)) = 0
      OR u.pseudo ILIKE '%' || replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
    AND COALESCE(u.is_banned, false) = false
    AND u.deleted_at IS NULL
  ORDER BY
    -- Exact (case-insensitive) match first, then prefix, then contains.
    CASE
      WHEN lower(u.pseudo) = lower(p_query) THEN 0
      WHEN lower(u.pseudo) LIKE lower(p_query) || '%' THEN 1
      ELSE 2
    END,
    u.pseudo
  LIMIT LEAST(GREATEST(p_limit, 1), 20);
$$;


--
-- Name: search_users(text, text, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_users(p_query text, p_grade text DEFAULT NULL::text, p_min_elo integer DEFAULT NULL::integer, p_max_elo integer DEFAULT NULL::integer, p_limit integer DEFAULT 20) RETURNS TABLE(user_id uuid, username text, grade text, duel_elo integer, level_cached integer, prestige_level integer, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT u.id, u.username, u.grade, COALESCE(pe.duel_elo, 1000)::INT, u.level_cached, COALESCE(u.prestige_level,0), u.created_at
  FROM users u
  LEFT JOIN player_elo pe ON pe.user_id = u.id
  WHERE (p_query IS NULL OR u.username ILIKE '%' || p_query || '%')
    AND (p_grade IS NULL OR u.grade = p_grade)
    AND (p_min_elo IS NULL OR COALESCE(pe.duel_elo, 1000) >= p_min_elo)
    AND (p_max_elo IS NULL OR COALESCE(pe.duel_elo, 1000) <= p_max_elo)
    AND u.deleted_at IS NULL
  ORDER BY COALESCE(pe.duel_elo, 1000) DESC
  LIMIT LEAST(p_limit, 50);
$$;


--
-- Name: server_recompute_no_coin_average(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.server_recompute_no_coin_average() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_avg numeric;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT AVG(duration)::numeric, COUNT(*) INTO v_avg, v_count
    FROM (
      SELECT duration FROM public.run_history
       WHERE user_id = v_uid AND status = 'valid'
       ORDER BY created_at DESC NULLS LAST
       LIMIT 500
    ) sub;

  IF v_count = 0 OR v_avg IS NULL THEN
    RETURN jsonb_build_object('success', true, 'count', 0, 'average', null);
  END IF;

  v_avg := ROUND(v_avg::numeric, 2);
  IF v_avg < 0 OR v_avg > 86400 THEN
    RETURN jsonb_build_object('success', false, 'error', 'avg_out_of_bounds');
  END IF;

  INSERT INTO public.scores (user_id, category, time)
  VALUES (v_uid, 'no_coin_average', v_avg)
  ON CONFLICT (user_id, category) DO UPDATE
    SET time = EXCLUDED.time;

  RETURN jsonb_build_object('success', true, 'count', v_count, 'average', v_avg);
END;
$$;


--
-- Name: set_active_cosmetic(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_active_cosmetic(p_slot text, p_cosmetic_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_owned  jsonb;
  v_active jsonb;
  v_is_default boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_slot NOT IN ('theme', 'particles', 'border') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_slot');
  END IF;
  IF p_cosmetic_id IS NULL OR length(p_cosmetic_id) = 0 OR length(p_cosmetic_id) > 80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_cosmetic_id');
  END IF;

  v_is_default := p_cosmetic_id IN ('theme-default', 'particles-none', 'border-none');

  SELECT COALESCE(cosmetics_owned, '[]'::jsonb), COALESCE(cosmetics_active, '{}'::jsonb)
    INTO v_owned, v_active
    FROM public.users
    WHERE id = v_uid
    FOR UPDATE;

  IF NOT v_is_default AND NOT (v_owned ? p_cosmetic_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_owned');
  END IF;

  v_active := jsonb_set(v_active, ARRAY[p_slot], to_jsonb(p_cosmetic_id), true);

  UPDATE public.users
     SET cosmetics_active = v_active,
         updated_at       = NOW()
   WHERE id = v_uid;

  RETURN jsonb_build_object('success', true, 'active', v_active);
END;
$$;


--
-- Name: set_correct_pseudo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_correct_pseudo() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF TG_TABLE_NAME = 'global_chat' THEN
    SELECT u.pseudo INTO NEW.pseudo FROM public.users u WHERE u.id = NEW.uid;
  ELSIF TG_TABLE_NAME IN ('direct_messages', 'broadcasts', 'friend_requests') THEN
    SELECT u.pseudo INTO NEW.from_pseudo FROM public.users u WHERE u.id = NEW.from_uid;
  ELSIF TG_TABLE_NAME = 'friends' THEN
    SELECT u.pseudo INTO NEW.friend_pseudo FROM public.users u WHERE u.id = NEW.friend_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_profile_extras(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_profile_extras(p_about_me text, p_linked jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user uuid := auth.uid();
  v_grade text;
  v_about text := substring(coalesce(p_about_me, '') from 1 for 600);
  v_linked jsonb;
  v_keys text[] := ARRAY['discord','twitter','twitch'];
  v_k text;
  v_clean jsonb := '{}'::jsonb;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  SELECT grade INTO v_grade FROM public.users WHERE id = v_user;
  -- About me available to all paid grades (star+); linked accounts to all
  IF v_grade NOT IN ('star','elite','legend') THEN
    -- free can still set linked accounts (display only)
    v_about := NULL;
  END IF;
  IF p_linked IS NOT NULL AND jsonb_typeof(p_linked) = 'object' THEN
    FOREACH v_k IN ARRAY v_keys LOOP
      IF p_linked ? v_k AND length(p_linked ->> v_k) BETWEEN 2 AND 32 THEN
        v_clean := v_clean || jsonb_build_object(v_k, p_linked ->> v_k);
      END IF;
    END LOOP;
  END IF;
  UPDATE public.users
    SET about_me = COALESCE(v_about, about_me),
        linked_accounts = v_clean,
        updated_at = now()
    WHERE id = v_user;
  RETURN jsonb_build_object('success', true);
END $$;


--
-- Name: set_team_chat_pseudo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_team_chat_pseudo() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  SELECT u.pseudo INTO NEW.pseudo FROM public.users u WHERE u.id = NEW.uid;
  RETURN NEW;
END;
$$;


--
-- Name: set_team_member_role(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_team_member_role(p_target_uid uuid, p_new_role character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team_id UUID;
  v_my_role VARCHAR;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_new_role NOT IN ('member', 'officer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_role');
  END IF;

  SELECT team_id, role INTO v_team_id, v_my_role
  FROM public.team_members WHERE user_id = v_user_id;

  IF v_my_role != 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'owner_only');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members WHERE team_id = v_team_id AND user_id = p_target_uid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_not_in_team');
  END IF;

  UPDATE public.team_members SET role = p_new_role
  WHERE team_id = v_team_id AND user_id = p_target_uid;

  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: set_url_slug(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_url_slug(p_slug text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
DECLARE
  v_user uuid := auth.uid();
  v_grade text;
  v_clean text := lower(trim(p_slug));
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  SELECT grade INTO v_grade FROM public.users WHERE id = v_user;
  IF v_grade <> 'legend' THEN RETURN jsonb_build_object('success', false, 'error', 'requires_legend'); END IF;
  IF v_clean !~ '^[a-z0-9_-]{3,32}$' THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_format'); END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE url_slug = v_clean AND id <> v_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'taken');
  END IF;
  UPDATE public.users SET url_slug = v_clean, updated_at = now() WHERE id = v_user;
  RETURN jsonb_build_object('success', true, 'slug', v_clean);
END $_$;


--
-- Name: spend_credits(integer, character varying, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.spend_credits(p_amount integer, p_type character varying DEFAULT 'purchase'::character varying, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  SELECT COALESCE(credits, 0) INTO v_balance FROM public.users WHERE id = v_uid FOR UPDATE;
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits', 'balance', v_balance);
  END IF;

  UPDATE public.users
    SET credits = credits - p_amount, updated_at = NOW()
  WHERE id = v_uid
  RETURNING credits INTO v_new_balance;

  INSERT INTO public.volt_credits(user_id, balance)
  VALUES (v_uid, GREATEST(0, v_new_balance))
  ON CONFLICT (user_id) DO UPDATE SET balance = GREATEST(0, v_new_balance), updated_at = NOW();

  INSERT INTO public.volt_credit_transactions(user_id, amount, type, description)
  VALUES (v_uid, -p_amount, p_type, p_description);

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END;
$$;


--
-- Name: strip_client_hwid(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.strip_client_hwid() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
BEGIN
  -- Accept the client-provided HWID on first insert IFF it looks like
  -- a 64-char hex SHA-256. Otherwise NULL; later mergeUserProfileTelemetry
  -- can backfill via the whitelist (regex-validated server-side).
  IF NEW.hwid IS NOT NULL AND NEW.hwid !~ '^[0-9a-f]{64}$' THEN
    NEW.hwid := NULL;
  END IF;
  RETURN NEW;
END $_$;


--
-- Name: submit_ban_appeal(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_ban_appeal(p_ban_id uuid, p_reason text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_logged_in');
  END IF;
  IF char_length(p_reason) < 10 THEN
    RETURN json_build_object('success', false, 'error', 'reason_too_short');
  END IF;
  -- Vérifier qu'un ban actif existe pour cet utilisateur
  IF p_ban_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM user_bans WHERE id = p_ban_id AND user_id = v_user_id AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    RETURN json_build_object('success', false, 'error', 'ban_not_found');
  END IF;
  BEGIN
    INSERT INTO ban_appeals (user_id, ban_id, reason)
    VALUES (v_user_id, p_ban_id, p_reason);
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'appeal_already_submitted');
  END;
  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: submit_replay_event(uuid, text, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_replay_event(p_match_id uuid, p_kind text, p_elapsed_ms integer, p_payload jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_match public.duel_matches%ROWTYPE;
  v_count_total int;
  v_count_recent int;
  v_last_elapsed int;
  v_max_allowed_elapsed int;
  ALLOWED_KINDS constant text[] := ARRAY['checkpoint','death','obstacle','jump','start','finish'];
  MAX_EVENTS_PER_MATCH constant int := 200;
  MAX_EVENTS_PER_SECOND constant int := 10;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF p_match_id IS NULL OR p_kind IS NULL OR p_elapsed_ms IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_payload');
  END IF;

  -- ANTI-CHEAT FIX #20a: kind whitelist
  IF NOT (p_kind = ANY(ALLOWED_KINDS)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_kind');
  END IF;

  -- ANTI-CHEAT FIX #20b: payload size cap (anti-DB-bloat)
  IF p_payload IS NOT NULL AND length(p_payload::text) > 4096 THEN
    RETURN jsonb_build_object('success', false, 'error', 'payload_too_large');
  END IF;

  SELECT * INTO v_match FROM public.duel_matches
  WHERE id = p_match_id
    AND (challenger_uid = v_uid OR opponent_uid = v_uid)
    AND status IN ('active','completed')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_a_participant');
  END IF;

  -- ANTI-CHEAT FIX #21a: bound elapsed_ms by real wall-clock since match start
  IF v_match.started_at IS NOT NULL THEN
    v_max_allowed_elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - v_match.started_at)) * 1000)::int + 2000);
    IF p_elapsed_ms > v_max_allowed_elapsed OR p_elapsed_ms < 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'elapsed_out_of_range');
    END IF;
  ELSIF p_elapsed_ms < 0 OR p_elapsed_ms > 43200000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'elapsed_invalid');
  END IF;

  -- ANTI-CHEAT FIX #21b: monotonic elapsed within (match, user)
  SELECT max(elapsed_ms) INTO v_last_elapsed
  FROM public.duel_replay_events
  WHERE match_id = p_match_id AND user_id = v_uid;
  IF v_last_elapsed IS NOT NULL AND p_elapsed_ms < v_last_elapsed - 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'elapsed_not_monotonic');
  END IF;

  -- ANTI-CHEAT FIX #20c: rate-limit per match
  SELECT count(*) INTO v_count_total
  FROM public.duel_replay_events
  WHERE match_id = p_match_id AND user_id = v_uid;
  IF v_count_total >= MAX_EVENTS_PER_MATCH THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_cap_reached');
  END IF;

  SELECT count(*) INTO v_count_recent
  FROM public.duel_replay_events
  WHERE match_id = p_match_id AND user_id = v_uid AND recorded_at > NOW() - INTERVAL '1 second';
  IF v_count_recent >= MAX_EVENTS_PER_SECOND THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;

  INSERT INTO public.duel_replay_events (match_id, user_id, kind, elapsed_ms, payload)
  VALUES (p_match_id, v_uid, p_kind, p_elapsed_ms, COALESCE(p_payload, '{}'::jsonb));

  RETURN jsonb_build_object('success', true);
END $$;


--
-- Name: sync_duel_token_stake(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_duel_token_stake() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_wager INTEGER := GREATEST(0, COALESCE(NEW.wager_tokens, NEW.wager_credits, 0));
  v_ch_escrow INTEGER := GREATEST(0, COALESCE(NEW.challenger_token_escrow, NEW.challenger_escrow, 0));
  v_op_escrow INTEGER := GREATEST(0, COALESCE(NEW.opponent_token_escrow, NEW.opponent_escrow, 0));
  v_status TEXT := 'locked';
BEGIN
  IF v_wager <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('cancelled','declined','expired') THEN
    v_status := 'refunded';
  ELSIF NEW.status = 'completed' THEN
    v_status := 'released';
  END IF;

  INSERT INTO public.duel_token_stakes(match_id, challenger_uid, opponent_uid, wager_tokens, pot_tokens, status, locked_at, released_at, updated_at)
  VALUES (NEW.id, NEW.challenger_uid, NEW.opponent_uid, v_wager, v_ch_escrow + v_op_escrow, v_status,
          COALESCE(NEW.accepted_at, NEW.created_at, NOW()), CASE WHEN v_status <> 'locked' THEN NOW() ELSE NULL END, NOW())
  ON CONFLICT (match_id) DO UPDATE
    SET wager_tokens = EXCLUDED.wager_tokens,
        pot_tokens = EXCLUDED.pot_tokens,
        status = EXCLUDED.status,
        released_at = COALESCE(public.duel_token_stakes.released_at, EXCLUDED.released_at),
        updated_at = NOW();

  RETURN NEW;
END;
$$;


--
-- Name: sync_user_elo_cache(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_user_elo_cache(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_row public.player_elo%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.player_elo WHERE user_id = p_user_id;
  IF FOUND THEN
    UPDATE public.users
    SET global_elo = v_row.global_elo,
        duel_elo = v_row.duel_elo,
        duel_total_played = v_row.duels_played,
        duel_wins = v_row.wins,
        duel_losses = v_row.losses,
        duel_draws = v_row.draws,
        duel_current_win_streak = v_row.current_win_streak,
        duel_best_win_streak = v_row.best_win_streak,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$;


--
-- Name: team_deposit_credits(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.team_deposit_credits(p_team_id uuid, p_amount integer, p_note text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_user_credits INTEGER;
BEGIN
  IF p_amount <= 0 OR p_amount > 10000 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_amount');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM team_members WHERE team_id = p_team_id AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'not_member');
  END IF;
  -- FOR UPDATE: verrouille la ligne pour éviter la race condition TOCTOU
  SELECT credits INTO v_user_credits FROM users WHERE id = auth.uid() FOR UPDATE;
  IF v_user_credits IS NULL OR v_user_credits < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'insufficient_credits');
  END IF;
  UPDATE users SET credits = credits - p_amount WHERE id = auth.uid();
  INSERT INTO team_credit_bank (team_id, balance)
    VALUES (p_team_id, p_amount)
    ON CONFLICT (team_id) DO UPDATE
      SET balance = team_credit_bank.balance + p_amount, updated_at = NOW();
  INSERT INTO team_credit_transactions (team_id, user_id, amount, type, note)
    VALUES (p_team_id, auth.uid(), p_amount, 'deposit', p_note);
  RETURN json_build_object(
    'success', true,
    'new_balance', (SELECT balance FROM team_credit_bank WHERE team_id = p_team_id)
  );
END;
$$;


--
-- Name: team_withdraw_credits(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.team_withdraw_credits(p_team_id uuid, p_user_target uuid, p_amount integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_bank_balance INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM teams WHERE id = p_team_id AND owner_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'not_owner');
  END IF;
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_amount');
  END IF;
  SELECT balance INTO v_bank_balance FROM team_credit_bank WHERE team_id = p_team_id;
  IF v_bank_balance IS NULL OR v_bank_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'insufficient_bank');
  END IF;
  UPDATE team_credit_bank
    SET balance = balance - p_amount, updated_at = NOW()
    WHERE team_id = p_team_id;
  UPDATE users SET credits = credits + p_amount WHERE id = p_user_target;
  INSERT INTO team_credit_transactions (team_id, user_id, amount, type)
    VALUES (p_team_id, p_user_target, p_amount, 'withdrawal');
  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: toggle_reaction(text, bigint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.toggle_reaction(p_table text, p_message_id bigint, p_emoji text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user uuid := auth.uid();
  v_table text := lower(trim(p_table));
  v_emoji text := substring(coalesce(p_emoji, '') from 1 for 12);
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF v_table NOT IN ('global_chat', 'direct_messages', 'team_chat') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_table');
  END IF;
  IF length(v_emoji) = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'empty_emoji'); END IF;
  IF EXISTS (SELECT 1 FROM public.message_reactions
             WHERE message_table = v_table AND message_id = p_message_id
               AND user_id = v_user AND emoji = v_emoji) THEN
    DELETE FROM public.message_reactions
      WHERE message_table = v_table AND message_id = p_message_id
        AND user_id = v_user AND emoji = v_emoji;
    RETURN jsonb_build_object('success', true, 'action', 'removed');
  ELSE
    INSERT INTO public.message_reactions (message_table, message_id, user_id, emoji)
    VALUES (v_table, p_message_id, v_user, v_emoji);
    RETURN jsonb_build_object('success', true, 'action', 'added');
  END IF;
END $$;


--
-- Name: track_hwid_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_hwid_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  recent_changes INT;
BEGIN
  IF (OLD.hwid IS DISTINCT FROM NEW.hwid) AND NEW.hwid IS NOT NULL AND NEW.hwid <> 'Unknown' THEN
    INSERT INTO public.hwid_history(user_id, old_hwid, new_hwid)
      VALUES (NEW.id, OLD.hwid, NEW.hwid);
    SELECT count(*) INTO recent_changes
      FROM public.hwid_history
      WHERE user_id = NEW.id
        AND changed_at > now() - interval '24 hours';
    IF recent_changes > 3 THEN
      -- Mark suspicious instead of blocking (admin reviews)
      UPDATE public.users SET suspicion_score = COALESCE(suspicion_score, 0) + 25
        WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: transfer_credits(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_credits(p_to_user uuid, p_amount integer, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
DECLARE
  v_balance INTEGER;
  v_from UUID := auth.uid();
  v_from_balance INTEGER;
  v_to_balance INTEGER;
BEGIN
  IF v_from IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_logged_in');
  END IF;
  IF v_from = p_to_user THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_transfer');
  END IF;
  IF p_amount < 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'min_100');
  END IF;

  INSERT INTO public.volt_credits(user_id, balance, total_earned)
  SELECT v_from, GREATEST(0, COALESCE(u.credits, 0)), GREATEST(0, COALESCE(u.credits, 0))
  FROM public.users u
  WHERE u.id = v_from
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.volt_credits(user_id, balance, total_earned)
  SELECT p_to_user, GREATEST(0, COALESCE(u.credits, 0)), GREATEST(0, COALESCE(u.credits, 0))
  FROM public.users u
  WHERE u.id = p_to_user
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance
  FROM public.volt_credits
  WHERE user_id = v_from
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits');
  END IF;

  v_from_balance := public.grant_credits_to_user(
    v_from,
    -p_amount,
    'gift',
    'Transfert envoyé',
    p_to_user
  );
  v_to_balance := public.grant_credits_to_user(
    p_to_user,
    p_amount,
    'gift',
    'Transfert reçu',
    v_from
  );

  UPDATE public.users SET credits = v_from_balance WHERE id = v_from;
  UPDATE public.users SET credits = v_to_balance WHERE id = p_to_user;

  INSERT INTO public.credit_transfers(from_user_id, to_user_id, amount, note)
  VALUES(v_from, p_to_user, p_amount, p_note);

  RETURN jsonb_build_object('success', true, 'new_balance', v_from_balance);
END;
$$;


--
-- Name: transfer_team_ownership(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_team_ownership(p_to_uid uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT team_id INTO v_team_id FROM public.team_members
  WHERE user_id = v_user_id AND role = 'owner';

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_owner');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members WHERE team_id = v_team_id AND user_id = p_to_uid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_not_in_team');
  END IF;

  UPDATE public.team_members SET role = 'member'  WHERE user_id = v_user_id;
  UPDATE public.team_members SET role = 'owner'   WHERE user_id = p_to_uid;
  UPDATE public.teams         SET owner_id = p_to_uid WHERE id = v_team_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: unblock_user_for_duels(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unblock_user_for_duels(p_target_uid uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  WITH d AS (
    DELETE FROM user_blocks
    WHERE user_id = v_uid AND blocked_uid = p_target_uid AND kind IN ('duels','all')
    RETURNING 1
  ) SELECT COUNT(*) INTO v_count FROM d;
  RETURN jsonb_build_object('success', true, 'removed', v_count);
END $$;


--
-- Name: unlock_achievement(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unlock_achievement(p_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ach RECORD;
  v_pelo RECORD;
  v_actual numeric;
  v_passes boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  SELECT * INTO v_ach FROM public.achievements WHERE id = p_id AND COALESCE(active, true);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_achievement');
  END IF;

  -- Idempotent: if already owned, no-op
  IF EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = v_uid AND achievement_id = p_id) THEN
    RETURN jsonb_build_object('success', true, 'already_owned', true);
  END IF;

  -- Server-side threshold enforcement by metric_key
  SELECT * INTO v_pelo FROM public.player_elo WHERE user_id = v_uid;
  v_passes := false;
  IF v_ach.metric_key = 'duel_wins' THEN
    v_actual := COALESCE(v_pelo.wins, 0);
  ELSIF v_ach.metric_key = 'best_win_streak' OR v_ach.metric_key = 'streak' THEN
    v_actual := COALESCE(v_pelo.best_win_streak, 0);
  ELSIF v_ach.metric_key = 'best_elo' OR v_ach.metric_key = 'duel_elo' THEN
    v_actual := COALESCE(v_pelo.duel_elo, 0);
  ELSIF v_ach.metric_key = 'duels_played' THEN
    v_actual := COALESCE(v_pelo.duels_played, 0);
  ELSIF v_ach.metric_key = 'first_duel_win' THEN
    v_actual := COALESCE(v_pelo.wins, 0);
  ELSIF v_ach.metric_key IS NULL OR v_ach.metric_key = 'manual' THEN
    -- Admin-only unlocks
    IF NOT public.is_admin() THEN
      RETURN jsonb_build_object('success', false, 'error', 'manual_only');
    END IF;
    v_passes := true;
  ELSE
    -- Unknown metric — refuse
    RETURN jsonb_build_object('success', false, 'error', 'unknown_metric');
  END IF;

  IF NOT v_passes THEN
    IF v_actual < COALESCE(v_ach.threshold, 1) THEN
      RETURN jsonb_build_object('success', false, 'error', 'threshold_not_met',
        'required', v_ach.threshold, 'actual', v_actual);
    END IF;
  END IF;

  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (v_uid, p_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'unlocked', p_id);
END $$;


--
-- Name: unlock_eligible_titles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unlock_eligible_titles() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user UUID := auth.uid();
  v_unlocked TEXT[] := ARRAY[]::TEXT[];
  v_level INT;
  v_total_runs INT;
  v_total_wins INT;
  v_title RECORD;
  v_parts TEXT[];
  v_cond_type TEXT;
  v_threshold INT;
  v_eligible BOOLEAN;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Defense-in-depth: never grant titles to a banned account.
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user AND is_banned = TRUE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'banned');
  END IF;

  SELECT COALESCE(level_cached, 1) INTO v_level FROM public.users WHERE id = v_user;
  -- run_history may not exist in some legacy environments; tolerate gracefully.
  BEGIN
    SELECT COUNT(*)::INT, COUNT(*) FILTER (WHERE is_win = TRUE)::INT
      INTO v_total_runs, v_total_wins
      FROM public.run_history
      WHERE user_id = v_user;
  EXCEPTION WHEN undefined_table THEN
    v_total_runs := 0;
    v_total_wins := 0;
  END;

  FOR v_title IN
    SELECT t.key, t.unlock_condition
      FROM public.titles t
     WHERE t.unlock_condition IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.user_titles ut
          WHERE ut.user_id = v_user AND ut.title_key = t.key
       )
  LOOP
    v_parts := string_to_array(v_title.unlock_condition, ':');
    v_cond_type := COALESCE(v_parts[1], '');
    v_threshold := NULLIF(v_parts[2], '')::INT;
    v_eligible := FALSE;

    IF v_threshold IS NOT NULL THEN
      IF v_cond_type = 'level' AND v_level >= v_threshold THEN
        v_eligible := TRUE;
      ELSIF v_cond_type = 'runs' AND v_total_runs >= v_threshold THEN
        v_eligible := TRUE;
      ELSIF v_cond_type = 'wins' AND v_total_wins >= v_threshold THEN
        v_eligible := TRUE;
      END IF;
    END IF;
    -- 'manual' / 'prestige' / unknown types never auto-unlock here.

    IF v_eligible THEN
      INSERT INTO public.user_titles (user_id, title_key)
        VALUES (v_user, v_title.key)
        ON CONFLICT DO NOTHING;
      v_unlocked := array_append(v_unlocked, v_title.key);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'unlocked', v_unlocked);
END;
$$;


--
-- Name: update_challenge_progress(character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_challenge_progress(p_challenge_key character varying, p_increment integer DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_challenge    RECORD;
  v_row          RECORD;
  v_new_progress INTEGER;
  v_new_balance  INTEGER;
  v_increment    INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF public.is_banned() THEN RAISE EXCEPTION 'account_banned'; END IF;
  v_increment := LEAST(86400, GREATEST(1, COALESCE(p_increment, 1)));

  SELECT * INTO v_challenge FROM public.daily_challenges
  WHERE key = p_challenge_key AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'challenge_not_found');
  END IF;

  -- Insérer la ligne si elle n'existe pas encore
  INSERT INTO public.user_daily_challenges(user_id, challenge_id, progress, day_key)
  VALUES (v_user_id, v_challenge.id, 0, CURRENT_DATE)
  ON CONFLICT (user_id, challenge_id, day_key) DO NOTHING;

  SELECT * INTO v_row FROM public.user_daily_challenges
  WHERE user_id = v_user_id AND challenge_id = v_challenge.id AND day_key = CURRENT_DATE;

  -- Déjà complété
  IF v_row.completed THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true,
      'credits_granted', v_row.credits_granted);
  END IF;

  -- Incrementer (plafond à target_value)
  IF v_challenge.type = 'run_duration' THEN
    -- Meilleur run unique : on garde la plus haute valeur
    v_new_progress := GREATEST(v_row.progress, LEAST(v_increment, v_challenge.target_value));
  ELSE
    -- Défis cumulatifs
    v_new_progress := LEAST(v_row.progress + v_increment, v_challenge.target_value);
  END IF;

  -- Complétion ?
  IF v_new_progress >= v_challenge.target_value THEN
    UPDATE public.user_daily_challenges
    SET progress        = v_new_progress,
        completed       = TRUE,
        completed_at    = NOW(),
        credits_granted = v_challenge.credits_reward
    WHERE user_id = v_user_id AND challenge_id = v_challenge.id AND day_key = CURRENT_DATE;

    v_new_balance := public.grant_credits_to_user(
      v_user_id, v_challenge.credits_reward, 'challenge_reward',
      format('Défi accompli : %s', v_challenge.title), v_challenge.id
    );

    RETURN jsonb_build_object(
      'success', true, 'completed', true,
      'credits_granted', v_challenge.credits_reward,
      'new_balance', v_new_balance,
      'challenge', v_challenge.title
    );
  ELSE
    UPDATE public.user_daily_challenges
    SET progress = v_new_progress
    WHERE user_id = v_user_id AND challenge_id = v_challenge.id AND day_key = CURRENT_DATE;

    RETURN jsonb_build_object(
      'success', true, 'completed', false,
      'progress', v_new_progress, 'target', v_challenge.target_value
    );
  END IF;
END;
$$;


--
-- Name: update_duel_run_state(character varying, integer, uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_duel_run_state(p_state character varying DEFAULT 'running'::character varying, p_elapsed_ms integer DEFAULT 0, p_match_id uuid DEFAULT NULL::uuid, p_run_started_at timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match public.duel_matches%ROWTYPE;
  v_existing public.duel_run_states%ROWTYPE;
  v_state VARCHAR(20) := lower(trim(COALESCE(p_state, 'running')));
  v_client_elapsed INTEGER := LEAST(43200000, GREATEST(0, COALESCE(p_elapsed_ms, 0)));
  v_now TIMESTAMPTZ := NOW();
  v_started TIMESTAMPTZ;
  v_client_started TIMESTAMPTZ;
  v_earliest_started TIMESTAMPTZ;
  v_initial_server_elapsed INTEGER := 0;
  v_server_elapsed INTEGER := 0;
  v_elapsed INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'not_authenticated'); END IF;
  IF public.is_banned() THEN RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'banned'); END IF;

  IF v_state IN ('dead', 'failed', 'abandoned', 'cancelled', 'timeout') THEN
    v_state := 'finished';
  ELSIF v_state NOT IN ('idle', 'running', 'finished') THEN
    v_state := 'running';
  END IF;

  -- PERF FIX: removed unconditional PERFORM public.expire_old_duels();
  -- Now handled by host cron /etc/cron.d/volt-duels (every 5 min).
  -- Probabilistic fallback (0.5% to keep latency low if cron drifts):
  IF random() < 0.005 THEN PERFORM public.expire_old_duels(); END IF;

  SELECT * INTO v_match
  FROM public.duel_matches
  WHERE status = 'active'
    AND COALESCE(ends_at, v_now + INTERVAL '13 hours') >= v_now
    AND (challenger_uid = v_user_id OR opponent_uid = v_user_id)
    AND (p_match_id IS NULL OR id = p_match_id)
  ORDER BY started_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'updated', false, 'reason', 'no_active_duel');
  END IF;

  IF p_run_started_at IS NOT NULL
     AND v_match.started_at IS NOT NULL
     AND p_run_started_at < (v_match.started_at - INTERVAL '3 seconds') THEN
    RETURN jsonb_build_object('success', true, 'updated', false, 'rejected', true, 'reason', 'run_started_before_duel', 'match_id', v_match.id);
  END IF;

  v_earliest_started := GREATEST(
    COALESCE(v_match.started_at, v_now) - INTERVAL '1 second',
    v_now - INTERVAL '10 seconds'
  );
  IF p_run_started_at IS NOT NULL THEN
    v_client_started := LEAST(v_now, GREATEST(p_run_started_at, v_earliest_started));
  ELSE
    v_client_started := v_now;
  END IF;

  SELECT * INTO v_existing
  FROM public.duel_run_states
  WHERE match_id = v_match.id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF v_state <> 'running' THEN
      RETURN jsonb_build_object('success', true, 'updated', false, 'rejected', true, 'reason', 'live_start_required', 'match_id', v_match.id);
    END IF;
    IF p_run_started_at IS NULL AND v_client_elapsed > 2500 THEN
      RETURN jsonb_build_object('success', true, 'updated', false, 'rejected', true, 'reason', 'missing_verified_duel_start', 'match_id', v_match.id);
    END IF;

    v_initial_server_elapsed := LEAST(43200000, GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_client_started)) * 1000)::INTEGER));

    INSERT INTO public.duel_run_states(match_id, user_id, state, elapsed_ms, run_started_at, last_seen_at, updated_at)
    VALUES (v_match.id, v_user_id, 'running', LEAST(v_client_elapsed, v_initial_server_elapsed + 10000), v_client_started, v_now, v_now);

    RETURN jsonb_build_object('success', true, 'updated', true, 'match_id', v_match.id, 'user_id', v_user_id, 'state', 'running', 'elapsed_ms', LEAST(v_client_elapsed, v_initial_server_elapsed + 10000), 'server_elapsed_ms', v_initial_server_elapsed, 'run_started_at', v_client_started, 'last_seen_at', v_now, 'updated_at', v_now);
  END IF;

  IF v_existing.run_started_at IS NULL AND v_state <> 'running' THEN
    RETURN jsonb_build_object('success', true, 'updated', false, 'rejected', true, 'reason', 'live_start_required', 'match_id', v_match.id);
  END IF;

  v_started := COALESCE(v_existing.run_started_at, CASE WHEN v_state = 'running' THEN v_client_started ELSE v_now END);
  IF v_match.started_at IS NOT NULL AND v_started < (v_match.started_at - INTERVAL '1.5 seconds') THEN
    RETURN jsonb_build_object('success', true, 'updated', false, 'rejected', true, 'reason', 'run_started_before_duel', 'match_id', v_match.id);
  END IF;

  v_server_elapsed := LEAST(43200000, GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_started)) * 1000)::INTEGER));

  IF v_state = 'running' THEN
    IF v_existing.state = 'finished' THEN
      RETURN jsonb_build_object('success', true, 'updated', false, 'reason', 'run_already_terminal', 'match_id', v_match.id, 'state', v_existing.state, 'elapsed_ms', v_existing.elapsed_ms, 'run_started_at', v_started);
    END IF;
    v_elapsed := LEAST(43200000, GREATEST(v_existing.elapsed_ms, LEAST(v_client_elapsed, v_server_elapsed + 10000)));
  ELSE
    v_elapsed := LEAST(43200000, GREATEST(v_existing.elapsed_ms, LEAST(v_client_elapsed, v_server_elapsed + 20000)));
  END IF;

  UPDATE public.duel_run_states
  SET state = v_state,
      elapsed_ms = v_elapsed,
      run_started_at = v_started,
      last_seen_at = v_now,
      updated_at = v_now
  WHERE match_id = v_match.id AND user_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'updated', true, 'match_id', v_match.id, 'user_id', v_user_id, 'state', v_state, 'elapsed_ms', v_elapsed, 'server_elapsed_ms', v_server_elapsed, 'run_started_at', v_started, 'last_seen_at', v_now, 'updated_at', v_now);
END;
$$;


--
-- Name: update_login_streak(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_login_streak() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row public.daily_login_streaks%ROWTYPE;
  v_today date := CURRENT_DATE;
  v_diff int;
  v_new_streak int;
  v_new_best int;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO v_row FROM public.daily_login_streaks WHERE user_id = v_user;
  IF NOT FOUND THEN
    INSERT INTO public.daily_login_streaks (user_id, current_streak, best_streak, last_login_date, total_logins)
    VALUES (v_user, 1, 1, v_today, 1);
    RETURN jsonb_build_object('success', true, 'streak', 1, 'best', 1, 'is_new', true);
  END IF;
  v_diff := (v_today - v_row.last_login_date)::int;
  IF v_diff = 0 THEN
    RETURN jsonb_build_object('success', true, 'streak', v_row.current_streak, 'best', v_row.best_streak, 'is_new', false);
  ELSIF v_diff = 1 THEN
    v_new_streak := v_row.current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;
  v_new_best := GREATEST(v_row.best_streak, v_new_streak);
  UPDATE public.daily_login_streaks
    SET current_streak = v_new_streak,
        best_streak = v_new_best,
        last_login_date = v_today,
        total_logins = total_logins + 1,
        updated_at = now()
    WHERE user_id = v_user;
  RETURN jsonb_build_object('success', true, 'streak', v_new_streak, 'best', v_new_best, 'is_new', true);
END $$;


--
-- Name: update_team_war_score(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_team_war_score() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE v_team_id UUID;
BEGIN
  SELECT team_id INTO v_team_id FROM team_members WHERE user_id = NEW.user_id LIMIT 1;
  IF v_team_id IS NOT NULL THEN
    UPDATE team_wars SET
      team_a_score = CASE WHEN team_a_id = v_team_id THEN team_a_score + 1 ELSE team_a_score END,
      team_b_score = CASE WHEN team_b_id = v_team_id THEN team_b_score + 1 ELSE team_b_score END
    WHERE (team_a_id = v_team_id OR team_b_id = v_team_id)
      AND week_start = date_trunc('week', CURRENT_DATE)::DATE
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_volt_presence(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_volt_presence(p_context character varying DEFAULT 'game'::character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_context VARCHAR(30) := LEFT(trim(COALESCE(p_context, 'game')), 30);
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF public.is_banned() THEN
    RETURN jsonb_build_object('success', false, 'error', 'banned');
  END IF;
  IF v_context = '' THEN v_context := 'game'; END IF;

  INSERT INTO public.volt_presence(user_id, context, last_seen_at, updated_at)
  VALUES (v_user_id, v_context, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET context = EXCLUDED.context,
        last_seen_at = NOW(),
        updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'online', true,
    'last_seen_at', NOW(),
    'context', v_context
  );
END;
$$;


--
-- Name: upsert_synthetic_score(text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_synthetic_score(p_category text, p_time numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_category NOT IN ('no_coin_average') THEN
    RETURN jsonb_build_object('success', false, 'error', 'category_not_allowed');
  END IF;
  IF p_time IS NULL OR p_time < 0 OR p_time > 86400 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_time');
  END IF;

  -- Use the partial-unique index `idx_scores_stats_unique` on (user_id, category)
  -- for non-speedrun/no_coin categories. The conflict target is the column pair
  -- itself; Postgres routes via the partial index automatically.
  INSERT INTO public.scores (user_id, category, time)
  VALUES (v_uid, p_category, p_time)
  ON CONFLICT (user_id, category) DO UPDATE
    SET time = EXCLUDED.time;

  RETURN jsonb_build_object('success', true, 'time', p_time);
END;
$$;


--
-- Name: use_referral_code(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.use_referral_code(p_user_id uuid, p_code text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_balance INTEGER;
  v_user_balance INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF (SELECT referred_by FROM public.users WHERE id = p_user_id) IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'already_referred');
  END IF;

  SELECT id INTO v_referrer_id
  FROM public.users
  WHERE referral_code = UPPER(TRIM(p_code)) AND id <> p_user_id;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  UPDATE public.users SET referred_by = v_referrer_id WHERE id = p_user_id;
  UPDATE public.users
  SET referral_credits_earned = COALESCE(referral_credits_earned, 0) + 100
  WHERE id = v_referrer_id;

  v_referrer_balance := public.grant_credits_to_user(
    v_referrer_id,
    100,
    'gift',
    'Bonus parrainage',
    p_user_id
  );
  v_user_balance := public.grant_credits_to_user(
    p_user_id,
    50,
    'gift',
    'Bonus invitation',
    v_referrer_id
  );

  UPDATE public.users SET credits = v_referrer_balance WHERE id = v_referrer_id;
  UPDATE public.users SET credits = v_user_balance WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'referrer_bonus', 100, 'user_bonus', 50);
END;
$$;


--
-- Name: volt_apply_duel_elo_on_completed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.volt_apply_duel_elo_on_completed() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.apply_duel_elo(NEW.id, 'duel_completed_trigger', 'duel_completed');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: volt_elo_rank(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.volt_elo_rank(p_elo integer) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  IF COALESCE(p_elo, 1000) >= 2200 THEN RETURN 'Grandmaster'; END IF;
  IF COALESCE(p_elo, 1000) >= 1900 THEN RETURN 'Master'; END IF;
  IF COALESCE(p_elo, 1000) >= 1700 THEN RETURN 'Diamond'; END IF;
  IF COALESCE(p_elo, 1000) >= 1500 THEN RETURN 'Platinum'; END IF;
  IF COALESCE(p_elo, 1000) >= 1300 THEN RETURN 'Gold'; END IF;
  IF COALESCE(p_elo, 1000) >= 1100 THEN RETURN 'Silver'; END IF;
  RETURN 'Bronze';
END;
$$;


--
-- Name: volt_payment_product(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.volt_payment_product(p_product_type text, p_product_id text) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_type TEXT := lower(trim(COALESCE(p_product_type, '')));
  v_id TEXT := lower(trim(COALESCE(p_product_id, '')));
BEGIN
  IF v_type = 'tokens' THEN
    CASE v_id
      WHEN 'tokens_5'  THEN RETURN jsonb_build_object('product_type','tokens','product_id',v_id,'tokens',5, 'amount_cents',500,  'currency','eur', 'label','5 tokens');
      WHEN 'tokens_10' THEN RETURN jsonb_build_object('product_type','tokens','product_id',v_id,'tokens',10,'amount_cents',1000, 'currency','eur', 'label','10 tokens');
      WHEN 'tokens_25' THEN RETURN jsonb_build_object('product_type','tokens','product_id',v_id,'tokens',25,'amount_cents',2500, 'currency','eur', 'label','25 tokens');
      WHEN 'tokens_50' THEN RETURN jsonb_build_object('product_type','tokens','product_id',v_id,'tokens',50,'amount_cents',5000, 'currency','eur', 'label','50 tokens');
      ELSE RAISE EXCEPTION 'invalid_payment_product';
    END CASE;
  ELSIF v_type = 'premium' THEN
    CASE v_id
      WHEN 'star_monthly'   THEN RETURN jsonb_build_object('product_type','premium','product_id',v_id,'grade','star',  'amount_cents',200,  'currency','eur','duration_days',30,  'label','STAR monthly');
      WHEN 'elite_monthly'  THEN RETURN jsonb_build_object('product_type','premium','product_id',v_id,'grade','elite', 'amount_cents',500,  'currency','eur','duration_days',30,  'label','ELITE monthly');
      WHEN 'legend_lifetime' THEN RETURN jsonb_build_object('product_type','premium','product_id',v_id,'grade','legend','amount_cents',1500, 'currency','eur','duration_days',NULL,'label','LEGEND lifetime');
      WHEN 'star'           THEN RETURN jsonb_build_object('product_type','premium','product_id','star_monthly',   'grade','star',  'amount_cents',200,  'currency','eur','duration_days',30,  'label','STAR monthly');
      WHEN 'elite'          THEN RETURN jsonb_build_object('product_type','premium','product_id','elite_monthly',  'grade','elite', 'amount_cents',500,  'currency','eur','duration_days',30,  'label','ELITE monthly');
      WHEN 'legend'         THEN RETURN jsonb_build_object('product_type','premium','product_id','legend_lifetime','grade','legend','amount_cents',1500, 'currency','eur','duration_days',NULL,'label','LEGEND lifetime');
      ELSE RAISE EXCEPTION 'invalid_payment_product';
    END CASE;
  END IF;
  RAISE EXCEPTION 'invalid_payment_type';
END;
$$;


--
-- Name: volt_rank_tier(numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.volt_rank_tier(p_elo numeric) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  IF p_elo IS NULL THEN RETURN 'Bronze'; END IF;
  IF p_elo < 1000 THEN RETURN 'Bronze'; END IF;
  IF p_elo < 1200 THEN RETURN 'Argent'; END IF;
  IF p_elo < 1400 THEN RETURN 'Or'; END IF;
  IF p_elo < 1600 THEN RETURN 'Platine'; END IF;
  IF p_elo < 1800 THEN RETURN 'Diamant'; END IF;
  IF p_elo < 2000 THEN RETURN 'Maître'; END IF;
  RETURN 'Champion';
END $$;


--
-- Name: volt_user_recent_average_seconds(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.volt_user_recent_average_seconds(p_user_id uuid) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_avg NUMERIC;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT AVG(duration)::NUMERIC INTO v_avg
  FROM (
    SELECT duration
    FROM public.run_history
    WHERE user_id = p_user_id
      AND duration >= 30
      AND duration <= 3600
      AND COALESCE(status, 'valid') = 'valid'
    ORDER BY created_at DESC
    LIMIT 20
  ) recent_runs;

  IF v_avg IS NULL OR v_avg < 30 OR v_avg > 3600 THEN
    RETURN NULL;
  END IF;
  RETURN v_avg;
END;
$$;


--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    icon text,
    points integer DEFAULT 10 NOT NULL,
    hidden boolean DEFAULT false NOT NULL,
    category text,
    min_grade text,
    threshold integer,
    metric_key text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: premium_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.premium_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    grade character varying(20) NOT NULL,
    payment_ref character varying(255),
    payment_method character varying(50) DEFAULT 'manual'::character varying,
    amount_cents integer,
    currency character varying(3) DEFAULT 'EUR'::character varying,
    starts_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    notes text,
    granted_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT premium_subscriptions_grade_check CHECK (((grade)::text = ANY ((ARRAY['star'::character varying, 'elite'::character varying, 'legend'::character varying])::text[])))
);


--
-- Name: active_premium; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.active_premium WITH (security_invoker='on') AS
 SELECT premium_subscriptions.user_id,
    premium_subscriptions.grade,
    premium_subscriptions.expires_at,
    premium_subscriptions.payment_method,
    premium_subscriptions.starts_at
   FROM public.premium_subscriptions
  WHERE ((premium_subscriptions.is_active = true) AND ((premium_subscriptions.expires_at IS NULL) OR (premium_subscriptions.expires_at > now())))
  ORDER BY
        CASE premium_subscriptions.grade
            WHEN 'legend'::text THEN 3
            WHEN 'elite'::text THEN 2
            WHEN 'star'::text THEN 1
            ELSE NULL::integer
        END DESC, premium_subscriptions.starts_at DESC;


--
-- Name: activity_feed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_feed (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid NOT NULL,
    actor_pseudo text,
    actor_grade text DEFAULT 'free'::text,
    actor_pic text,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT activity_feed_event_type_check CHECK ((event_type = ANY (ARRAY['run_completed'::text, 'achievement_unlocked'::text, 'duel_won'::text, 'streak_milestone'::text])))
);


--
-- Name: admin_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    target_user_id uuid,
    target_type text NOT NULL,
    target_id text,
    action text NOT NULL,
    reason text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    user_agent text,
    extension_info jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT aal_metadata_object CHECK (((metadata IS NULL) OR (jsonb_typeof(metadata) = 'object'::text))),
    CONSTRAINT admin_audit_logs_reason_check CHECK ((char_length(TRIM(BOTH FROM reason)) >= 3))
);


--
-- Name: admin_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_roles (
    user_id uuid NOT NULL,
    role text NOT NULL,
    permissions text[] DEFAULT ARRAY[]::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    CONSTRAINT admin_roles_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'moderator'::text, 'support'::text])))
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value text,
    updated_at timestamp with time zone DEFAULT now(),
    feature_flags jsonb DEFAULT '{}'::jsonb NOT NULL,
    maintenance_mode boolean DEFAULT false NOT NULL
);


--
-- Name: ban_appeals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ban_appeals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    ban_id uuid,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_response text,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    CONSTRAINT appeal_reason_length CHECK ((char_length(reason) <= 1000)),
    CONSTRAINT appeal_response_length CHECK ((char_length(admin_response) <= 500)),
    CONSTRAINT ban_appeals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: blacklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blacklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier character varying(255) NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: broadcasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broadcasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_uid uuid NOT NULL,
    from_pseudo character varying(100),
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: category_bounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_bounds (
    category text NOT NULL,
    min_seconds numeric NOT NULL,
    max_seconds numeric NOT NULL,
    CONSTRAINT category_bounds_check CHECK ((min_seconds < max_seconds)),
    CONSTRAINT category_bounds_max_seconds_check CHECK ((max_seconds <= (43200)::numeric)),
    CONSTRAINT category_bounds_min_seconds_check CHECK ((min_seconds > (0)::numeric))
);


--
-- Name: client_error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    client_version text,
    kind text NOT NULL,
    message text,
    context jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: community_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title_fr text NOT NULL,
    title_en text NOT NULL,
    description_fr text NOT NULL,
    goal_value integer NOT NULL,
    current_value integer DEFAULT 0 NOT NULL,
    reward_credits integer DEFAULT 0 NOT NULL,
    reward_xp integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT community_challenges_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config (
    id bigint NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.config_id_seq OWNED BY public.config.id;


--
-- Name: cosmetics_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cosmetics_catalog (
    cosmetic_id text NOT NULL,
    cost integer NOT NULL,
    category text NOT NULL,
    is_free boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cosmetics_catalog_category_check CHECK ((category = ANY (ARRAY['theme'::text, 'particles'::text, 'border'::text, 'badge'::text, 'effect'::text]))),
    CONSTRAINT cosmetics_catalog_cost_check CHECK ((cost >= 0))
);


--
-- Name: credit_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_user_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    amount integer NOT NULL,
    note character varying(200),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT credit_transfers_amount_check CHECK ((amount >= 100))
);


--
-- Name: daily_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(50) NOT NULL,
    title character varying(100) NOT NULL,
    description text NOT NULL,
    icon text DEFAULT '🎯'::character varying,
    credits_reward integer DEFAULT 1 NOT NULL,
    target_value integer DEFAULT 1 NOT NULL,
    type character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT challenge_credits_range CHECK (((credits_reward >= 1) AND (credits_reward <= 100))),
    CONSTRAINT challenge_type_check CHECK (((type)::text = ANY ((ARRAY['run_count'::character varying, 'run_duration'::character varying, 'total_run_time'::character varying, 'chat_count'::character varying, 'team_chat_count'::character varying, 'login'::character varying, 'custom'::character varying])::text[])))
);


--
-- Name: daily_login_streaks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_login_streaks (
    user_id uuid NOT NULL,
    current_streak integer DEFAULT 0 NOT NULL,
    best_streak integer DEFAULT 0 NOT NULL,
    last_login_date date DEFAULT CURRENT_DATE NOT NULL,
    total_logins integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: daily_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_rewards (
    day integer NOT NULL,
    credits_reward integer DEFAULT 0 NOT NULL,
    xp_reward integer DEFAULT 0 NOT NULL,
    special_reward text,
    icon text DEFAULT '🎁'::text NOT NULL,
    CONSTRAINT daily_rewards_day_check CHECK (((day >= 1) AND (day <= 30)))
);


--
-- Name: direct_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direct_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id text NOT NULL,
    from_uid uuid NOT NULL,
    from_pseudo character varying(100),
    to_uid uuid NOT NULL,
    message text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    delete_reason text,
    CONSTRAINT dm_message_length CHECK ((char_length(message) <= 2000))
);


--
-- Name: duel_bot_brackets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duel_bot_brackets (
    id integer NOT NULL,
    min_elo integer NOT NULL,
    max_elo integer NOT NULL,
    min_seconds numeric NOT NULL,
    max_seconds numeric NOT NULL,
    CONSTRAINT duel_bot_brackets_check CHECK ((max_seconds > min_seconds)),
    CONSTRAINT duel_bot_brackets_check1 CHECK ((min_elo < max_elo)),
    CONSTRAINT duel_bot_brackets_min_seconds_check CHECK ((min_seconds > (0)::numeric))
);


--
-- Name: duel_bot_brackets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.duel_bot_brackets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: duel_bot_brackets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.duel_bot_brackets_id_seq OWNED BY public.duel_bot_brackets.id;


--
-- Name: duel_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duel_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_elo numeric DEFAULT 1000,
    from_pic text,
    status character varying(20) DEFAULT 'pending'::character varying,
    expires_at timestamp with time zone DEFAULT (now() + '00:00:30'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    sender_pseudo character varying(100),
    receiver_pseudo character varying(100),
    duel_id uuid,
    CONSTRAINT duel_invites_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: duel_match_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duel_match_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    user_id uuid NOT NULL,
    score numeric NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'valid'::text NOT NULL,
    source text DEFAULT 'duel'::text NOT NULL,
    invalidated_at timestamp with time zone,
    invalidated_by uuid,
    invalidation_reason text,
    original_score numeric,
    admin_note text,
    CONSTRAINT dmr_admin_note_length CHECK ((char_length(admin_note) <= 500)),
    CONSTRAINT dmr_invalidation_reason_length CHECK ((char_length(invalidation_reason) <= 500)),
    CONSTRAINT duel_match_results_score_check CHECK (((score > (0)::numeric) AND (score <= (43200)::numeric))),
    CONSTRAINT duel_match_results_status_check CHECK ((status = ANY (ARRAY['valid'::text, 'invalid'::text, 'admin_voided'::text, 'restored'::text])))
);


--
-- Name: duel_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duel_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenger_uid uuid NOT NULL,
    opponent_uid uuid,
    mode character varying(30) DEFAULT 'no_coin'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:05:00'::interval),
    accepted_at timestamp with time zone,
    started_at timestamp with time zone,
    ends_at timestamp with time zone,
    completed_at timestamp with time zone,
    winner_uid uuid,
    wager_credits integer DEFAULT 0 NOT NULL,
    challenger_escrow integer DEFAULT 0 NOT NULL,
    opponent_escrow integer DEFAULT 0 NOT NULL,
    wager_tokens integer DEFAULT 0 NOT NULL,
    challenger_token_escrow integer DEFAULT 0 NOT NULL,
    opponent_token_escrow integer DEFAULT 0 NOT NULL,
    voided_at timestamp with time zone,
    voided_by uuid,
    cancelled_by uuid,
    admin_note text,
    admin_resolution jsonb DEFAULT '{}'::jsonb NOT NULL,
    elo_processed boolean DEFAULT false NOT NULL,
    elo_processed_at timestamp with time zone,
    elo_winner_delta integer,
    elo_loser_delta integer,
    is_bot_match boolean DEFAULT false NOT NULL,
    bot_score numeric,
    bot_generated_at timestamp with time zone,
    bot_distribution_bucket character varying(20),
    winner_side character varying(20),
    bot_pseudo character varying(40),
    abandoned_by uuid,
    abandoned_at timestamp with time zone,
    finish_reason character varying(40),
    cancel_reason character varying(40),
    series_wins_required integer DEFAULT 1 NOT NULL,
    series_max_rounds integer DEFAULT 1 NOT NULL,
    current_round integer DEFAULT 1 NOT NULL,
    challenger_round_wins integer DEFAULT 0 NOT NULL,
    opponent_round_wins integer DEFAULT 0 NOT NULL,
    series_winner_uid uuid,
    series_winner_side character varying(20),
    series_completed_at timestamp with time zone,
    CONSTRAINT dm_admin_note_length CHECK ((char_length(admin_note) <= 500)),
    CONSTRAINT dm_admin_resolution_object CHECK (((admin_resolution IS NULL) OR (jsonb_typeof(admin_resolution) = 'object'::text))),
    CONSTRAINT duel_bot_score_check CHECK (((bot_score IS NULL) OR ((bot_score >= (60)::numeric) AND (bot_score <= (3600)::numeric)))),
    CONSTRAINT duel_bot_shape_check CHECK ((((is_bot_match = false) AND (opponent_uid IS NOT NULL)) OR ((is_bot_match = true) AND (opponent_uid IS NULL) AND (bot_score IS NOT NULL) AND (bot_score >= (60)::numeric) AND (bot_score <= (3600)::numeric)))),
    CONSTRAINT duel_current_round_check CHECK (((current_round >= 1) AND (current_round <= series_max_rounds))),
    CONSTRAINT duel_matches_challenger_token_escrow_check CHECK ((challenger_token_escrow >= 0)),
    CONSTRAINT duel_matches_opponent_token_escrow_check CHECK ((opponent_token_escrow >= 0)),
    CONSTRAINT duel_matches_wager_tokens_check CHECK (((wager_tokens >= 0) AND (wager_tokens <= 10000))),
    CONSTRAINT duel_mode_check CHECK (((mode)::text = 'no_coin'::text)),
    CONSTRAINT duel_no_self CHECK (((opponent_uid IS NULL) OR (challenger_uid <> opponent_uid))),
    CONSTRAINT duel_round_wins_check CHECK (((challenger_round_wins >= 0) AND (opponent_round_wins >= 0) AND (challenger_round_wins <= series_wins_required) AND (opponent_round_wins <= series_wins_required))),
    CONSTRAINT duel_series_max_rounds_check CHECK ((series_max_rounds = ((series_wins_required * 2) - 1))),
    CONSTRAINT duel_series_winner_side_check CHECK (((series_winner_side IS NULL) OR ((series_winner_side)::text = ANY (ARRAY[('challenger'::character varying)::text, ('opponent'::character varying)::text, ('draw'::character varying)::text])))),
    CONSTRAINT duel_series_wins_required_check CHECK ((series_wins_required = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT duel_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying, 'completed'::character varying, 'declined'::character varying, 'cancelled'::character varying, 'expired'::character varying, 'voided'::character varying])::text[]))),
    CONSTRAINT duel_wager_non_negative CHECK (((wager_credits >= 0) AND (challenger_escrow >= 0) AND (opponent_escrow >= 0))),
    CONSTRAINT duel_winner_side_check CHECK (((winner_side IS NULL) OR ((winner_side)::text = ANY ((ARRAY['challenger'::character varying, 'opponent'::character varying, 'draw'::character varying])::text[]))))
);


--
-- Name: duel_random_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duel_random_queue (
    user_id uuid NOT NULL,
    mode character varying(30) DEFAULT 'no_coin'::character varying NOT NULL,
    wager_credits integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    wager_tokens integer DEFAULT 0 NOT NULL,
    series_wins_required integer DEFAULT 1 NOT NULL,
    series_max_rounds integer DEFAULT 1 NOT NULL,
    CONSTRAINT duel_random_queue_series_max_check CHECK ((series_max_rounds = ((series_wins_required * 2) - 1))),
    CONSTRAINT duel_random_queue_series_wins_check CHECK ((series_wins_required = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT duel_random_queue_wager_credits_check CHECK (((wager_credits >= 0) AND (wager_credits <= 10000))),
    CONSTRAINT duel_random_queue_wager_tokens_check CHECK (((wager_tokens >= 0) AND (wager_tokens <= 10000)))
);


--
-- Name: duel_replay_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duel_replay_events (
    id bigint NOT NULL,
    match_id uuid NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    elapsed_ms integer NOT NULL,
    payload jsonb,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT duel_replay_events_elapsed_ms_check CHECK (((elapsed_ms >= 0) AND (elapsed_ms <= 43200000))),
    CONSTRAINT duel_replay_events_kind_check CHECK ((kind = ANY (ARRAY['checkpoint'::text, 'event'::text, 'milestone'::text, 'custom'::text])))
);


--
-- Name: duel_replay_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.duel_replay_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: duel_replay_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.duel_replay_events_id_seq OWNED BY public.duel_replay_events.id;


--
-- Name: duel_round_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duel_round_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    round_number integer NOT NULL,
    challenger_uid uuid NOT NULL,
    opponent_uid uuid,
    challenger_score numeric,
    opponent_score numeric,
    winner_uid uuid,
    winner_side character varying(20) DEFAULT 'draw'::character varying NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT duel_round_results_round_check CHECK ((round_number >= 1)),
    CONSTRAINT duel_round_results_score_check CHECK ((((challenger_score IS NULL) OR ((challenger_score > (0)::numeric) AND (challenger_score <= (43200)::numeric))) AND ((opponent_score IS NULL) OR ((opponent_score > (0)::numeric) AND (opponent_score <= (43200)::numeric))))),
    CONSTRAINT duel_round_results_winner_side_check CHECK (((winner_side)::text = ANY (ARRAY[('challenger'::character varying)::text, ('opponent'::character varying)::text, ('draw'::character varying)::text])))
);


--
-- Name: duel_run_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duel_run_states (
    match_id uuid NOT NULL,
    user_id uuid NOT NULL,
    state character varying(20) DEFAULT 'idle'::character varying NOT NULL,
    elapsed_ms integer DEFAULT 0 NOT NULL,
    run_started_at timestamp with time zone,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT duel_run_elapsed_check CHECK (((elapsed_ms >= 0) AND (elapsed_ms <= 43200000))),
    CONSTRAINT duel_run_state_check CHECK (((state)::text = ANY ((ARRAY['idle'::character varying, 'ready'::character varying, 'running'::character varying, 'finished'::character varying, 'abandoned'::character varying, 'reset'::character varying])::text[]))),
    CONSTRAINT duel_run_states_elapsed_ms_check CHECK (((elapsed_ms IS NULL) OR (elapsed_ms >= 0)))
);


--
-- Name: duel_token_stakes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duel_token_stakes (
    match_id uuid NOT NULL,
    challenger_uid uuid NOT NULL,
    opponent_uid uuid,
    wager_tokens integer DEFAULT 0 NOT NULL,
    pot_tokens integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'locked'::character varying NOT NULL,
    locked_at timestamp with time zone DEFAULT now() NOT NULL,
    released_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT duel_token_stakes_pot_tokens_check CHECK ((pot_tokens >= 0)),
    CONSTRAINT duel_token_stakes_status_check CHECK (((status)::text = ANY ((ARRAY['locked'::character varying, 'released'::character varying, 'refunded'::character varying, 'cancelled'::character varying, 'void'::character varying])::text[]))),
    CONSTRAINT duel_token_stakes_wager_tokens_check CHECK ((wager_tokens >= 0))
);


--
-- Name: duels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invite_id uuid,
    challenger_elo numeric DEFAULT 1000,
    opponent_elo numeric DEFAULT 1000,
    challenger_elo_after numeric,
    opponent_elo_after numeric,
    challenger_coins integer DEFAULT 0,
    opponent_coins integer DEFAULT 0,
    challenger_death_at timestamp with time zone,
    opponent_death_at timestamp with time zone,
    loser_uid uuid,
    status character varying(20) DEFAULT 'countdown'::character varying,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    player1_id uuid NOT NULL,
    player2_id uuid NOT NULL,
    player1_pseudo character varying(100),
    player2_pseudo character varying(100),
    CONSTRAINT duels_status_check CHECK (((status)::text = ANY ((ARRAY['countdown'::character varying, 'active'::character varying, 'finished'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: elo_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elo_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    duel_id uuid,
    opponent_id uuid,
    old_elo integer NOT NULL,
    new_elo integer NOT NULL,
    elo_delta integer NOT NULL,
    result character varying(20) NOT NULL,
    duel_type character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    token_wager integer DEFAULT 0 NOT NULL,
    reason text DEFAULT 'duel_completed'::text NOT NULL,
    validation_source text DEFAULT 'server'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT elo_history_duel_type_check CHECK (((duel_type)::text = ANY ((ARRAY['normal'::character varying, 'token'::character varying])::text[]))),
    CONSTRAINT elo_history_result_check CHECK (((result)::text = ANY ((ARRAY['win'::character varying, 'loss'::character varying, 'draw'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT elo_history_token_wager_check CHECK ((token_wager >= 0))
);


--
-- Name: elo_season_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elo_season_rewards (
    id integer NOT NULL,
    season_id integer NOT NULL,
    user_id uuid NOT NULL,
    rank integer NOT NULL,
    rank_tier text,
    reward_tokens integer DEFAULT 0 NOT NULL,
    reward_badge_id integer,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: elo_season_rewards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.elo_season_rewards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: elo_season_rewards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.elo_season_rewards_id_seq OWNED BY public.elo_season_rewards.id;


--
-- Name: elo_season_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elo_season_snapshots (
    season_id integer NOT NULL,
    user_id uuid NOT NULL,
    final_elo integer NOT NULL,
    final_rank integer NOT NULL,
    rank_tier text,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    draws integer DEFAULT 0 NOT NULL,
    best_streak integer DEFAULT 0 NOT NULL,
    duels_played integer DEFAULT 0 NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: elo_seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elo_seasons (
    id integer NOT NULL,
    name text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT elo_seasons_check CHECK ((ends_at > starts_at))
);


--
-- Name: elo_seasons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.elo_seasons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: elo_seasons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.elo_seasons_id_seq OWNED BY public.elo_seasons.id;


--
-- Name: follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follows (
    follower_id uuid NOT NULL,
    followee_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT follows_check CHECK ((follower_id <> followee_id))
);


--
-- Name: friend_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friend_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_uid uuid NOT NULL,
    from_pseudo character varying(100),
    receiver_id uuid NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval)
);


--
-- Name: friends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    friend_id uuid NOT NULL,
    friend_pseudo character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: global_chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_chat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uid uuid NOT NULL,
    pseudo character varying(100),
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reply_to uuid,
    user_grade character varying(20) DEFAULT NULL::character varying,
    user_grade_color character varying(7) DEFAULT NULL::character varying,
    user_grade_badge character varying(10) DEFAULT NULL::character varying,
    user_grade_rainbow boolean DEFAULT false,
    user_grade_color_mode text DEFAULT 'solid'::text,
    user_grade_color_2 character varying(7) DEFAULT NULL::character varying,
    user_grade_color_angle integer DEFAULT 90,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    delete_reason text,
    CONSTRAINT global_chat_text_check CHECK (((char_length(text) >= 1) AND (char_length(text) <= 500)))
);


--
-- Name: hwid_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hwid_history (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    old_hwid text,
    new_hwid text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hwid_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hwid_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hwid_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hwid_history_id_seq OWNED BY public.hwid_history.id;


--
-- Name: ignore_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ignore_list (
    user_id uuid NOT NULL,
    ignored_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ignore_list_check CHECK ((user_id <> ignored_id))
);


--
-- Name: ip_bans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_bans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address inet NOT NULL,
    reason text NOT NULL,
    banned_by uuid,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ip_ban_reason_length CHECK ((char_length(reason) <= 500))
);


--
-- Name: loot_box_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loot_box_catalog (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    icon text DEFAULT '📦'::text,
    cost_credits integer NOT NULL,
    min_grade text DEFAULT 'free'::text,
    rewards jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT loot_box_catalog_cost_credits_check CHECK ((cost_credits > 0))
);


--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reactions (
    message_id bigint NOT NULL,
    message_table text NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_reactions_emoji_check CHECK ((length(emoji) <= 12)),
    CONSTRAINT message_reactions_message_table_check CHECK ((message_table = ANY (ARRAY['global_chat'::text, 'direct_messages'::text, 'team_chat'::text])))
);


--
-- Name: moderation_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    target_user_id uuid,
    target_type text NOT NULL,
    target_id text,
    action text NOT NULL,
    reason text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT moderation_actions_reason_check CHECK ((char_length(TRIM(BOTH FROM reason)) >= 3))
);


--
-- Name: moderation_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    action_type character varying(100) NOT NULL,
    target_user_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: monthly_credit_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_credit_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    month_key character varying(7) NOT NULL,
    grade character varying(20) NOT NULL,
    credits integer NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(30) DEFAULT 'stripe'::character varying NOT NULL,
    provider_session_id text,
    provider_payment_id text,
    product_type character varying(20) NOT NULL,
    product_id character varying(50) NOT NULL,
    amount_cents integer NOT NULL,
    currency character varying(10) DEFAULT 'eur'::character varying NOT NULL,
    tokens integer DEFAULT 0 NOT NULL,
    grade character varying(20),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    checkout_url text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    idempotency_key text,
    CONSTRAINT payment_orders_amount_cents_check CHECK ((amount_cents >= 0)),
    CONSTRAINT payment_orders_product_payload CHECK (((((product_type)::text = 'tokens'::text) AND (tokens > 0) AND (grade IS NULL)) OR (((product_type)::text = 'premium'::text) AND (tokens = 0) AND ((grade)::text = ANY ((ARRAY['star'::character varying, 'elite'::character varying, 'legend'::character varying])::text[]))))),
    CONSTRAINT payment_orders_product_type_check CHECK (((product_type)::text = ANY ((ARRAY['tokens'::character varying, 'premium'::character varying])::text[]))),
    CONSTRAINT payment_orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'checkout_created'::character varying, 'paid'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'refunded'::character varying, 'chargeback'::character varying])::text[]))),
    CONSTRAINT payment_orders_tokens_check CHECK ((tokens >= 0))
);


--
-- Name: payment_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider character varying(30) NOT NULL,
    event_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'received'::character varying NOT NULL,
    error text,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    CONSTRAINT payment_webhook_events_status_check CHECK (((status)::text = ANY ((ARRAY['received'::character varying, 'processed'::character varying, 'ignored'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT pwe_payload_object CHECK (((payload IS NULL) OR (jsonb_typeof(payload) = 'object'::text)))
);


--
-- Name: premium_emojis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.premium_emojis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug character varying(50) NOT NULL,
    emoji text NOT NULL,
    label character varying(100),
    min_grade character varying(20) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT premium_emojis_min_grade_check CHECK (((min_grade)::text = ANY ((ARRAY['star'::character varying, 'elite'::character varying, 'legend'::character varying])::text[])))
);


--
-- Name: profile_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_views (
    id bigint NOT NULL,
    profile_id uuid NOT NULL,
    viewer_id uuid,
    viewer_hash text,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    viewed_day date GENERATED ALWAYS AS (((viewed_at AT TIME ZONE 'UTC'::text))::date) STORED
);


--
-- Name: profile_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.profile_views_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: profile_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.profile_views_id_seq OWNED BY public.profile_views.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    username character varying(255),
    pseudo character varying(100),
    role character varying(50) DEFAULT 'user'::character varying,
    "profilePic" text,
    "bannerPic" text,
    "userLevel" integer DEFAULT 1,
    xp integer DEFAULT 0,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email character varying(255),
    is_banned boolean DEFAULT false,
    hwid character varying(255),
    grade character varying(20) DEFAULT NULL::character varying,
    grade_expires_at timestamp with time zone,
    grade_color character varying(7) DEFAULT NULL::character varying,
    grade_title character varying(60) DEFAULT NULL::character varying,
    grade_badge character varying(10) DEFAULT NULL::character varying,
    grade_rainbow boolean DEFAULT false,
    grade_frame character varying(50) DEFAULT NULL::character varying,
    grade_color_mode text DEFAULT 'solid'::text,
    grade_color_2 character varying(7) DEFAULT NULL::character varying,
    grade_color_angle integer DEFAULT 90,
    last_ip character varying(45),
    first_name text,
    last_name text,
    full_name text,
    google_avatar_url text,
    auth_provider text,
    global_elo integer DEFAULT 1000 NOT NULL,
    duel_elo integer DEFAULT 1000 NOT NULL,
    duel_total_played integer DEFAULT 0 NOT NULL,
    duel_wins integer DEFAULT 0 NOT NULL,
    duel_losses integer DEFAULT 0 NOT NULL,
    duel_draws integer DEFAULT 0 NOT NULL,
    duel_best_win_streak integer DEFAULT 0 NOT NULL,
    duel_current_win_streak integer DEFAULT 0 NOT NULL,
    suspicion_score integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    about_me text,
    url_slug text,
    custom_css text,
    linked_accounts jsonb DEFAULT '{}'::jsonb,
    profile_views_count integer DEFAULT 0 NOT NULL,
    status_text character varying(60) DEFAULT NULL::character varying,
    level_cached integer DEFAULT 1 NOT NULL,
    active_title text,
    referral_code text,
    referred_by uuid,
    referral_credits_earned integer DEFAULT 0 NOT NULL,
    deletion_requested_at timestamp with time zone,
    prestige_level integer DEFAULT 0,
    cosmetic_badges text[] DEFAULT '{}'::text[],
    credits integer DEFAULT 0 NOT NULL,
    pseudo_change_count integer DEFAULT 0 NOT NULL,
    cosmetics_owned jsonb DEFAULT '[]'::jsonb NOT NULL,
    cosmetics_active jsonb DEFAULT '{}'::jsonb NOT NULL,
    banner_size integer,
    banner_offset integer,
    CONSTRAINT users_about_me_check CHECK ((length(about_me) <= 600)),
    CONSTRAINT users_active_title_length CHECK ((char_length(active_title) <= 40)),
    CONSTRAINT users_banner_offset_check CHECK (((banner_offset IS NULL) OR ((banner_offset >= '-300'::integer) AND (banner_offset <= 300)))),
    CONSTRAINT users_banner_size_check CHECK (((banner_size IS NULL) OR ((banner_size >= 50) AND (banner_size <= 250)))),
    CONSTRAINT users_credits_non_negative CHECK ((credits >= 0)),
    CONSTRAINT users_custom_css_check CHECK ((length(custom_css) <= 8192)),
    CONSTRAINT users_duel_stats_non_negative CHECK (((duel_total_played >= 0) AND (duel_wins >= 0) AND (duel_losses >= 0) AND (duel_draws >= 0))),
    CONSTRAINT users_elo_non_negative CHECK (((global_elo >= 0) AND (duel_elo >= 0))),
    CONSTRAINT users_status_text_length CHECK ((char_length((status_text)::text) <= 60)),
    CONSTRAINT users_url_slug_check CHECK (((url_slug IS NULL) OR (url_slug ~ '^[a-z0-9_-]{3,32}$'::text))),
    CONSTRAINT users_xp_positive CHECK ((xp >= 0))
);


--
-- Name: profiles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.profiles WITH (security_invoker='on') AS
 SELECT users.id,
    users.pseudo,
    users."profilePic",
    users."bannerPic",
    users."userLevel",
    users.xp,
    users.grade,
    users.grade_color,
    users.grade_badge,
    users.grade_rainbow,
    users.created_at,
    users.username,
    users.grade_color_mode,
    users.grade_color_2,
    users.grade_color_angle,
    users.updated_at
   FROM public.users;


--
-- Name: run_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.run_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    duration numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'valid'::text NOT NULL,
    source text DEFAULT 'user'::text NOT NULL,
    added_by_admin uuid,
    updated_by_admin uuid,
    invalidated_at timestamp with time zone,
    invalidated_by uuid,
    invalidation_reason text,
    original_duration numeric,
    admin_note text,
    CONSTRAINT rh_admin_note_length CHECK ((char_length(admin_note) <= 500)),
    CONSTRAINT rh_invalidation_reason_length CHECK ((char_length(invalidation_reason) <= 500)),
    CONSTRAINT run_history_duration_check CHECK ((duration > (0)::numeric)),
    CONSTRAINT run_history_status_check CHECK ((status = ANY (ARRAY['valid'::text, 'invalid'::text, 'admin_voided'::text, 'restored'::text])))
);


--
-- Name: score_nonces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.score_nonces (
    nonce text NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:05:00'::interval) NOT NULL
);


--
-- Name: score_signatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.score_signatures (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    "time" numeric NOT NULL,
    client_sig text NOT NULL,
    signed_payload text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: score_signatures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.score_signatures_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: score_signatures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.score_signatures_id_seq OWNED BY public.score_signatures.id;


--
-- Name: scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category character varying(100) NOT NULL,
    "time" numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'valid'::text NOT NULL,
    source text DEFAULT 'user'::text NOT NULL,
    added_by_admin uuid,
    updated_by_admin uuid,
    invalidated_at timestamp with time zone,
    invalidated_by uuid,
    invalidation_reason text,
    original_time numeric,
    admin_note text,
    CONSTRAINT sc_admin_note_length CHECK ((char_length(admin_note) <= 500)),
    CONSTRAINT sc_invalidation_reason_length CHECK ((char_length(invalidation_reason) <= 500)),
    CONSTRAINT scores_category_check CHECK ((((category)::text = ANY ((ARRAY['speedrun'::character varying, 'no_coin'::character varying, 'no_coin_record'::character varying, 'no_coin_average'::character varying, 'stats_elo'::character varying])::text[])) OR ((category)::text ~~ 'no_coin_weekly_%'::text))),
    CONSTRAINT scores_status_check CHECK ((status = ANY (ARRAY['valid'::text, 'invalid'::text, 'admin_voided'::text, 'restored'::text]))),
    CONSTRAINT scores_time_check CHECK (("time" > (0)::numeric))
);


--
-- Name: season_pass_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.season_pass_nodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id integer,
    node_order integer NOT NULL,
    xp_required integer NOT NULL,
    reward_type character varying(50) NOT NULL,
    reward_value jsonb NOT NULL,
    is_premium_only boolean DEFAULT false
);


--
-- Name: season_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.season_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id integer NOT NULL,
    user_id uuid NOT NULL,
    final_elo integer NOT NULL,
    final_rank integer,
    percentile numeric(5,1),
    rewarded boolean DEFAULT false NOT NULL,
    snapshotted_at timestamp with time zone DEFAULT now()
);


--
-- Name: seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seasons (
    id integer NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    reward_cosmetic text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT seasons_dates_valid CHECK ((end_date > start_date))
);


--
-- Name: seasons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seasons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seasons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seasons_id_seq OWNED BY public.seasons.id;


--
-- Name: spin_wheel_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spin_wheel_items (
    id integer NOT NULL,
    label_fr text NOT NULL,
    label_en text NOT NULL,
    reward_type text NOT NULL,
    reward_value integer DEFAULT 0,
    reward_key text,
    weight integer DEFAULT 10 NOT NULL,
    color text DEFAULT '#8b5cf6'::text NOT NULL,
    icon text DEFAULT '🎁'::text NOT NULL,
    CONSTRAINT spin_wheel_items_reward_type_check CHECK ((reward_type = ANY (ARRAY['credits'::text, 'xp'::text, 'title'::text, 'cosmetic'::text, 'nothing'::text]))),
    CONSTRAINT spin_wheel_items_weight_check CHECK ((weight > 0))
);


--
-- Name: spin_wheel_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.spin_wheel_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: spin_wheel_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.spin_wheel_items_id_seq OWNED BY public.spin_wheel_items.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(30) DEFAULT 'stripe'::character varying NOT NULL,
    provider_customer_id text,
    provider_subscription_id text,
    grade character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    source_order_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_grade_check CHECK (((grade)::text = ANY ((ARRAY['star'::character varying, 'elite'::character varying, 'legend'::character varying])::text[]))),
    CONSTRAINT subscriptions_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'past_due'::character varying, 'cancelled'::character varying, 'expired'::character varying, 'trialing'::character varying, 'incomplete'::character varying])::text[])))
);


--
-- Name: team_achievement_unlocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_achievement_unlocks (
    team_id uuid NOT NULL,
    achievement_key text NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now()
);


--
-- Name: team_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_achievements (
    id integer NOT NULL,
    key text NOT NULL,
    label_fr text NOT NULL,
    label_en text NOT NULL,
    description_fr text NOT NULL,
    condition_type text NOT NULL,
    condition_value integer NOT NULL,
    icon text DEFAULT '🏆'::text NOT NULL
);


--
-- Name: team_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_achievements_id_seq OWNED BY public.team_achievements.id;


--
-- Name: team_chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_chat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    uid uuid NOT NULL,
    pseudo character varying(100),
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    delete_reason text,
    CONSTRAINT team_chat_text_len CHECK (((char_length(text) >= 1) AND (char_length(text) <= 500)))
);


--
-- Name: team_credit_bank; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_credit_bank (
    team_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_credit_bank_balance_check CHECK ((balance >= 0))
);


--
-- Name: team_credit_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_credit_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid,
    amount integer NOT NULL,
    type text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tctr_note_length CHECK ((char_length(note) <= 200)),
    CONSTRAINT team_credit_transactions_type_check CHECK ((type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'reward'::text])))
);


--
-- Name: team_daily_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_daily_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    challenge_type character varying(50) NOT NULL,
    description text NOT NULL,
    target_value integer NOT NULL,
    current_value integer DEFAULT 0,
    expires_at date DEFAULT CURRENT_DATE,
    reward_credits integer DEFAULT 50,
    completed_at timestamp with time zone
);


--
-- Name: team_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    from_uid uuid NOT NULL,
    to_uid uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    CONSTRAINT invite_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'expired'::character varying])::text[])))
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_member_role_check CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'officer'::character varying, 'member'::character varying])::text[])))
);


--
-- Name: team_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_request_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying])::text[])))
);


--
-- Name: team_wars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_wars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_a_id uuid NOT NULL,
    team_b_id uuid NOT NULL,
    week_start date DEFAULT (date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone))::date NOT NULL,
    team_a_score integer DEFAULT 0 NOT NULL,
    team_b_score integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    winner_team_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT no_self_war CHECK ((team_a_id <> team_b_id)),
    CONSTRAINT team_wars_status_check CHECK ((status = ANY (ARRAY['active'::text, 'finished'::text])))
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(30) NOT NULL,
    tag character varying(5) NOT NULL,
    description text,
    icon text DEFAULT '⚡'::character varying,
    owner_id uuid NOT NULL,
    max_members integer DEFAULT 5 NOT NULL,
    is_public boolean DEFAULT true,
    wins integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    delete_reason text,
    admin_note text,
    CONSTRAINT team_max_cap CHECK (((max_members >= 5) AND (max_members <= 50))),
    CONSTRAINT team_name_length CHECK (((char_length((name)::text) >= 3) AND (char_length((name)::text) <= 30))),
    CONSTRAINT team_tag_length CHECK (((char_length((tag)::text) >= 2) AND (char_length((tag)::text) <= 5))),
    CONSTRAINT teams_admin_note_length CHECK ((char_length(admin_note) <= 500)),
    CONSTRAINT teams_delete_reason_length CHECK ((char_length(delete_reason) <= 500))
);


--
-- Name: titles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.titles (
    id integer NOT NULL,
    key text NOT NULL,
    label_fr text NOT NULL,
    label_en text NOT NULL,
    unlock_condition text NOT NULL,
    rarity text DEFAULT 'common'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT titles_rarity_check CHECK ((rarity = ANY (ARRAY['common'::text, 'rare'::text, 'epic'::text, 'legendary'::text])))
);


--
-- Name: titles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.titles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: titles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.titles_id_seq OWNED BY public.titles.id;


--
-- Name: volt_token_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.volt_token_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    amount integer NOT NULL,
    type character varying(40) NOT NULL,
    description text,
    ref_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT volt_token_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['admin_grant'::character varying, 'admin_revoke'::character varying, 'duel_escrow'::character varying, 'duel_win'::character varying, 'duel_refund'::character varying, 'purchase'::character varying, 'payment_refund'::character varying, 'payment_chargeback'::character varying])::text[])))
);


--
-- Name: token_transactions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.token_transactions WITH (security_invoker='on') AS
 SELECT volt_token_transactions.id,
    volt_token_transactions.user_id,
    volt_token_transactions.amount,
    volt_token_transactions.type,
    volt_token_transactions.description,
    volt_token_transactions.ref_id,
    volt_token_transactions.created_by,
    volt_token_transactions.created_at
   FROM public.volt_token_transactions;


--
-- Name: tournament_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid NOT NULL,
    round integer NOT NULL,
    bracket_slot integer NOT NULL,
    player_a uuid,
    player_b uuid,
    winner_uid uuid,
    duel_match_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    scheduled_at timestamp with time zone,
    completed_at timestamp with time zone,
    CONSTRAINT tournament_matches_round_check CHECK ((round >= 1)),
    CONSTRAINT tournament_matches_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'completed'::text, 'walkover'::text])))
);


--
-- Name: tournament_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_participants (
    tournament_id uuid NOT NULL,
    user_id uuid NOT NULL,
    seed integer,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    eliminated_at timestamp with time zone,
    final_rank integer
);


--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournaments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    format text DEFAULT 'single_elim_8'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    entry_tokens integer DEFAULT 0 NOT NULL,
    prize_tokens integer DEFAULT 0 NOT NULL,
    max_players integer DEFAULT 8 NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tournaments_entry_tokens_check CHECK ((entry_tokens >= 0)),
    CONSTRAINT tournaments_format_check CHECK ((format = ANY (ARRAY['single_elim_8'::text, 'single_elim_16'::text]))),
    CONSTRAINT tournaments_max_players_check CHECK ((max_players = ANY (ARRAY[8, 16]))),
    CONSTRAINT tournaments_prize_tokens_check CHECK ((prize_tokens >= 0)),
    CONSTRAINT tournaments_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    user_id uuid NOT NULL,
    achievement_id text NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_bans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_bans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    ban_type text NOT NULL,
    reason text NOT NULL,
    admin_note text,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    lifted_by uuid,
    lifted_at timestamp with time zone,
    lift_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ub_admin_note_length CHECK ((char_length(admin_note) <= 1000)),
    CONSTRAINT user_bans_ban_type_check CHECK ((ban_type = ANY (ARRAY['global'::text, 'chat'::text, 'leaderboard'::text, 'runs'::text, 'duels'::text, 'clans'::text]))),
    CONSTRAINT user_bans_check CHECK (((expires_at IS NULL) OR (expires_at > starts_at))),
    CONSTRAINT user_bans_reason_check CHECK ((char_length(TRIM(BOTH FROM reason)) >= 3))
);


--
-- Name: user_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    blocked_uid uuid NOT NULL,
    kind text NOT NULL,
    reason text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_blocks_check CHECK ((user_id <> blocked_uid)),
    CONSTRAINT user_blocks_kind_check CHECK ((kind = ANY (ARRAY['duels'::text, 'chat'::text, 'dm'::text, 'all'::text])))
);


--
-- Name: user_daily_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_daily_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    challenge_id uuid NOT NULL,
    progress integer DEFAULT 0,
    completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    day_key date DEFAULT CURRENT_DATE NOT NULL,
    credits_granted integer DEFAULT 0
);


--
-- Name: user_daily_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_daily_claims (
    user_id uuid NOT NULL,
    last_claim_date date DEFAULT CURRENT_DATE NOT NULL,
    streak_at_claim integer DEFAULT 1 NOT NULL
);


--
-- Name: user_hmac_secrets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_hmac_secrets (
    user_id uuid NOT NULL,
    secret_b64 text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    rotated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_loot_boxes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_loot_boxes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    box_type text NOT NULL,
    reward_type text NOT NULL,
    reward_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    credits_spent integer DEFAULT 0 NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_lucky_boxes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_lucky_boxes (
    user_id uuid NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_lucky_boxes_count_check CHECK ((count >= 0))
);


--
-- Name: TABLE user_lucky_boxes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_lucky_boxes IS 'Lucky box counter — incremented by grant_lucky_box (any path), decremented atomically by open_lucky_box (FOR UPDATE lock prevents TOCTOU).';


--
-- Name: user_season_pass_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_season_pass_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    season_id integer NOT NULL,
    claimed_nodes uuid[] DEFAULT '{}'::uuid[],
    is_premium boolean DEFAULT false
);


--
-- Name: user_spin_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_spin_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    item_id integer NOT NULL,
    spun_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_titles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_titles (
    user_id uuid NOT NULL,
    title_key text NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now()
);


--
-- Name: v_admin_review_queue; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_admin_review_queue WITH (security_invoker='on') AS
 SELECT m.id AS match_id,
    m.status,
    m.created_at,
    m.completed_at,
    m.challenger_uid,
    m.opponent_uid,
    m.winner_uid,
    m.is_bot_match,
    COALESCE(uc.suspicion_score, 0) AS challenger_suspicion,
    COALESCE(uo.suspicion_score, 0) AS opponent_suspicion
   FROM ((public.duel_matches m
     LEFT JOIN public.users uc ON ((uc.id = m.challenger_uid)))
     LEFT JOIN public.users uo ON ((uo.id = m.opponent_uid)))
  WHERE (((m.status)::text = ANY ((ARRAY['voided'::character varying, 'cancelled'::character varying, 'abandoned'::character varying])::text[])) OR (COALESCE(uc.suspicion_score, 0) >= 50) OR (COALESCE(uo.suspicion_score, 0) >= 50));


--
-- Name: volt_credit_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.volt_credit_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    ref_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT credit_tx_type_check CHECK (((type)::text = ANY (ARRAY['monthly_grant'::text, 'daily_challenge'::text, 'admin_grant'::text, 'team_slot_purchase'::text, 'gift'::text, 'refund'::text, 'run_bonus'::text, 'challenge_reward'::text, 'duel_escrow'::text, 'duel_win'::text, 'duel_refund'::text, 'cosmetic_purchase'::text, 'lucky_box_grant'::text, 'lucky_box_use'::text, 'lucky_box_reward'::text])))
);


--
-- Name: volt_credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.volt_credits (
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    total_earned integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vc_balance_nn CHECK ((balance >= 0)),
    CONSTRAINT volt_credits_balance_non_negative CHECK ((balance >= 0))
);


--
-- Name: volt_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.volt_presence (
    user_id uuid NOT NULL,
    context character varying(30) DEFAULT 'extension'::character varying,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: volt_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.volt_tokens (
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    total_granted integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT volt_tokens_balance_check CHECK ((balance >= 0)),
    CONSTRAINT volt_tokens_total_granted_check CHECK ((total_granted >= 0)),
    CONSTRAINT vt_balance_nn CHECK ((balance >= 0))
);


--
-- Name: config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config ALTER COLUMN id SET DEFAULT nextval('public.config_id_seq'::regclass);


--
-- Name: duel_bot_brackets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_bot_brackets ALTER COLUMN id SET DEFAULT nextval('public.duel_bot_brackets_id_seq'::regclass);


--
-- Name: duel_replay_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_replay_events ALTER COLUMN id SET DEFAULT nextval('public.duel_replay_events_id_seq'::regclass);


--
-- Name: elo_season_rewards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_season_rewards ALTER COLUMN id SET DEFAULT nextval('public.elo_season_rewards_id_seq'::regclass);


--
-- Name: elo_seasons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_seasons ALTER COLUMN id SET DEFAULT nextval('public.elo_seasons_id_seq'::regclass);


--
-- Name: hwid_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hwid_history ALTER COLUMN id SET DEFAULT nextval('public.hwid_history_id_seq'::regclass);


--
-- Name: profile_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_views ALTER COLUMN id SET DEFAULT nextval('public.profile_views_id_seq'::regclass);


--
-- Name: score_signatures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_signatures ALTER COLUMN id SET DEFAULT nextval('public.score_signatures_id_seq'::regclass);


--
-- Name: seasons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons ALTER COLUMN id SET DEFAULT nextval('public.seasons_id_seq'::regclass);


--
-- Name: spin_wheel_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spin_wheel_items ALTER COLUMN id SET DEFAULT nextval('public.spin_wheel_items_id_seq'::regclass);


--
-- Name: team_achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_achievements ALTER COLUMN id SET DEFAULT nextval('public.team_achievements_id_seq'::regclass);


--
-- Name: titles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titles ALTER COLUMN id SET DEFAULT nextval('public.titles_id_seq'::regclass);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: activity_feed activity_feed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_feed
    ADD CONSTRAINT activity_feed_pkey PRIMARY KEY (id);


--
-- Name: admin_audit_logs admin_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_roles admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (user_id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: ban_appeals ban_appeals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ban_appeals
    ADD CONSTRAINT ban_appeals_pkey PRIMARY KEY (id);


--
-- Name: ban_appeals ban_appeals_user_id_ban_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ban_appeals
    ADD CONSTRAINT ban_appeals_user_id_ban_id_key UNIQUE (user_id, ban_id);


--
-- Name: blacklist blacklist_identifier_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blacklist
    ADD CONSTRAINT blacklist_identifier_key UNIQUE (identifier);


--
-- Name: blacklist blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blacklist
    ADD CONSTRAINT blacklist_pkey PRIMARY KEY (id);


--
-- Name: broadcasts broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);


--
-- Name: category_bounds category_bounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_bounds
    ADD CONSTRAINT category_bounds_pkey PRIMARY KEY (category);


--
-- Name: client_error_logs client_error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_error_logs
    ADD CONSTRAINT client_error_logs_pkey PRIMARY KEY (id);


--
-- Name: community_challenges community_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_challenges
    ADD CONSTRAINT community_challenges_pkey PRIMARY KEY (id);


--
-- Name: config config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config
    ADD CONSTRAINT config_key_key UNIQUE (key);


--
-- Name: config config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config
    ADD CONSTRAINT config_pkey PRIMARY KEY (id);


--
-- Name: cosmetics_catalog cosmetics_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosmetics_catalog
    ADD CONSTRAINT cosmetics_catalog_pkey PRIMARY KEY (cosmetic_id);


--
-- Name: credit_transfers credit_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transfers
    ADD CONSTRAINT credit_transfers_pkey PRIMARY KEY (id);


--
-- Name: daily_challenges daily_challenges_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_challenges
    ADD CONSTRAINT daily_challenges_key_key UNIQUE (key);


--
-- Name: daily_challenges daily_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_challenges
    ADD CONSTRAINT daily_challenges_pkey PRIMARY KEY (id);


--
-- Name: daily_login_streaks daily_login_streaks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_login_streaks
    ADD CONSTRAINT daily_login_streaks_pkey PRIMARY KEY (user_id);


--
-- Name: daily_rewards daily_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_rewards
    ADD CONSTRAINT daily_rewards_pkey PRIMARY KEY (day);


--
-- Name: direct_messages direct_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_pkey PRIMARY KEY (id);


--
-- Name: duel_bot_brackets duel_bot_brackets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_bot_brackets
    ADD CONSTRAINT duel_bot_brackets_pkey PRIMARY KEY (id);


--
-- Name: duel_invites duel_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_invites
    ADD CONSTRAINT duel_invites_pkey PRIMARY KEY (id);


--
-- Name: duel_match_results duel_match_results_match_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_match_results
    ADD CONSTRAINT duel_match_results_match_id_user_id_key UNIQUE (match_id, user_id);


--
-- Name: duel_match_results duel_match_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_match_results
    ADD CONSTRAINT duel_match_results_pkey PRIMARY KEY (id);


--
-- Name: duel_matches duel_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_matches
    ADD CONSTRAINT duel_matches_pkey PRIMARY KEY (id);


--
-- Name: duel_random_queue duel_random_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_random_queue
    ADD CONSTRAINT duel_random_queue_pkey PRIMARY KEY (user_id);


--
-- Name: duel_replay_events duel_replay_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_replay_events
    ADD CONSTRAINT duel_replay_events_pkey PRIMARY KEY (id);


--
-- Name: duel_round_results duel_round_results_match_round_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_round_results
    ADD CONSTRAINT duel_round_results_match_round_key UNIQUE (match_id, round_number);


--
-- Name: duel_round_results duel_round_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_round_results
    ADD CONSTRAINT duel_round_results_pkey PRIMARY KEY (id);


--
-- Name: duel_run_states duel_run_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_run_states
    ADD CONSTRAINT duel_run_states_pkey PRIMARY KEY (match_id, user_id);


--
-- Name: duel_token_stakes duel_token_stakes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_token_stakes
    ADD CONSTRAINT duel_token_stakes_pkey PRIMARY KEY (match_id);


--
-- Name: duels duels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duels
    ADD CONSTRAINT duels_pkey PRIMARY KEY (id);


--
-- Name: elo_history elo_history_duel_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_history
    ADD CONSTRAINT elo_history_duel_id_user_id_key UNIQUE (duel_id, user_id);


--
-- Name: elo_history elo_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_history
    ADD CONSTRAINT elo_history_pkey PRIMARY KEY (id);


--
-- Name: elo_season_rewards elo_season_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_season_rewards
    ADD CONSTRAINT elo_season_rewards_pkey PRIMARY KEY (id);


--
-- Name: elo_season_snapshots elo_season_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_season_snapshots
    ADD CONSTRAINT elo_season_snapshots_pkey PRIMARY KEY (season_id, user_id);


--
-- Name: elo_seasons elo_seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_seasons
    ADD CONSTRAINT elo_seasons_pkey PRIMARY KEY (id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (follower_id, followee_id);


--
-- Name: friend_requests friend_requests_from_uid_receiver_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_from_uid_receiver_id_key UNIQUE (from_uid, receiver_id);


--
-- Name: friend_requests friend_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_pkey PRIMARY KEY (id);


--
-- Name: friends friends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_pkey PRIMARY KEY (id);


--
-- Name: friends friends_user_id_friend_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_user_id_friend_id_key UNIQUE (user_id, friend_id);


--
-- Name: global_chat global_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_chat
    ADD CONSTRAINT global_chat_pkey PRIMARY KEY (id);


--
-- Name: hwid_history hwid_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hwid_history
    ADD CONSTRAINT hwid_history_pkey PRIMARY KEY (id);


--
-- Name: ignore_list ignore_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ignore_list
    ADD CONSTRAINT ignore_list_pkey PRIMARY KEY (user_id, ignored_id);


--
-- Name: ip_bans ip_bans_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_bans
    ADD CONSTRAINT ip_bans_ip_address_key UNIQUE (ip_address);


--
-- Name: ip_bans ip_bans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_bans
    ADD CONSTRAINT ip_bans_pkey PRIMARY KEY (id);


--
-- Name: loot_box_catalog loot_box_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loot_box_catalog
    ADD CONSTRAINT loot_box_catalog_pkey PRIMARY KEY (id);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (message_table, message_id, user_id, emoji);


--
-- Name: moderation_actions moderation_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_pkey PRIMARY KEY (id);


--
-- Name: moderation_log moderation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_log
    ADD CONSTRAINT moderation_log_pkey PRIMARY KEY (id);


--
-- Name: monthly_credit_grants monthly_credit_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_credit_grants
    ADD CONSTRAINT monthly_credit_grants_pkey PRIMARY KEY (id);


--
-- Name: monthly_credit_grants monthly_credit_grants_user_id_month_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_credit_grants
    ADD CONSTRAINT monthly_credit_grants_user_id_month_key_key UNIQUE (user_id, month_key);


--
-- Name: payment_orders payment_orders_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: payment_orders payment_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_pkey PRIMARY KEY (id);


--
-- Name: payment_webhook_events payment_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_webhook_events
    ADD CONSTRAINT payment_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: payment_webhook_events payment_webhook_events_provider_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_webhook_events
    ADD CONSTRAINT payment_webhook_events_provider_event_id_key UNIQUE (provider, event_id);


--
-- Name: player_elo player_elo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_elo
    ADD CONSTRAINT player_elo_pkey PRIMARY KEY (user_id);


--
-- Name: premium_emojis premium_emojis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.premium_emojis
    ADD CONSTRAINT premium_emojis_pkey PRIMARY KEY (id);


--
-- Name: premium_emojis premium_emojis_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.premium_emojis
    ADD CONSTRAINT premium_emojis_slug_key UNIQUE (slug);


--
-- Name: premium_subscriptions premium_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.premium_subscriptions
    ADD CONSTRAINT premium_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: profile_views profile_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_views
    ADD CONSTRAINT profile_views_pkey PRIMARY KEY (id);


--
-- Name: run_history run_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_history
    ADD CONSTRAINT run_history_pkey PRIMARY KEY (id);


--
-- Name: score_nonces score_nonces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_nonces
    ADD CONSTRAINT score_nonces_pkey PRIMARY KEY (nonce);


--
-- Name: score_signatures score_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_signatures
    ADD CONSTRAINT score_signatures_pkey PRIMARY KEY (id);


--
-- Name: scores scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_pkey PRIMARY KEY (id);


--
-- Name: season_pass_nodes season_pass_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_pass_nodes
    ADD CONSTRAINT season_pass_nodes_pkey PRIMARY KEY (id);


--
-- Name: season_pass_nodes season_pass_nodes_season_id_node_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_pass_nodes
    ADD CONSTRAINT season_pass_nodes_season_id_node_order_key UNIQUE (season_id, node_order);


--
-- Name: season_snapshots season_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_snapshots
    ADD CONSTRAINT season_snapshots_pkey PRIMARY KEY (id);


--
-- Name: season_snapshots season_snapshots_season_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_snapshots
    ADD CONSTRAINT season_snapshots_season_id_user_id_key UNIQUE (season_id, user_id);


--
-- Name: seasons seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_pkey PRIMARY KEY (id);


--
-- Name: spin_wheel_items spin_wheel_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spin_wheel_items
    ADD CONSTRAINT spin_wheel_items_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: team_achievement_unlocks team_achievement_unlocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_achievement_unlocks
    ADD CONSTRAINT team_achievement_unlocks_pkey PRIMARY KEY (team_id, achievement_key);


--
-- Name: team_achievements team_achievements_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_achievements
    ADD CONSTRAINT team_achievements_key_key UNIQUE (key);


--
-- Name: team_achievements team_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_achievements
    ADD CONSTRAINT team_achievements_pkey PRIMARY KEY (id);


--
-- Name: team_chat team_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_chat
    ADD CONSTRAINT team_chat_pkey PRIMARY KEY (id);


--
-- Name: team_credit_bank team_credit_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_credit_bank
    ADD CONSTRAINT team_credit_bank_pkey PRIMARY KEY (team_id);


--
-- Name: team_credit_transactions team_credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_credit_transactions
    ADD CONSTRAINT team_credit_transactions_pkey PRIMARY KEY (id);


--
-- Name: team_daily_challenges team_daily_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_daily_challenges
    ADD CONSTRAINT team_daily_challenges_pkey PRIMARY KEY (id);


--
-- Name: team_invites team_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_key UNIQUE (user_id);


--
-- Name: team_requests team_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_requests
    ADD CONSTRAINT team_requests_pkey PRIMARY KEY (id);


--
-- Name: team_requests team_requests_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_requests
    ADD CONSTRAINT team_requests_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: team_wars team_wars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_wars
    ADD CONSTRAINT team_wars_pkey PRIMARY KEY (id);


--
-- Name: team_wars team_wars_team_a_id_team_b_id_week_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_wars
    ADD CONSTRAINT team_wars_team_a_id_team_b_id_week_start_key UNIQUE (team_a_id, team_b_id, week_start);


--
-- Name: teams teams_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_name_key UNIQUE (name);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: teams teams_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_tag_key UNIQUE (tag);


--
-- Name: titles titles_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titles
    ADD CONSTRAINT titles_key_key UNIQUE (key);


--
-- Name: titles titles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titles
    ADD CONSTRAINT titles_pkey PRIMARY KEY (id);


--
-- Name: tournament_matches tournament_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_pkey PRIMARY KEY (id);


--
-- Name: tournament_matches tournament_matches_tournament_id_round_bracket_slot_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_tournament_id_round_bracket_slot_key UNIQUE (tournament_id, round, bracket_slot);


--
-- Name: tournament_participants tournament_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_participants
    ADD CONSTRAINT tournament_participants_pkey PRIMARY KEY (tournament_id, user_id);


--
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (user_id, achievement_id);


--
-- Name: user_bans user_bans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_bans
    ADD CONSTRAINT user_bans_pkey PRIMARY KEY (id);


--
-- Name: user_blocks user_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (id);


--
-- Name: user_daily_challenges user_daily_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_challenges
    ADD CONSTRAINT user_daily_challenges_pkey PRIMARY KEY (id);


--
-- Name: user_daily_challenges user_daily_challenges_user_id_challenge_id_day_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_challenges
    ADD CONSTRAINT user_daily_challenges_user_id_challenge_id_day_key_key UNIQUE (user_id, challenge_id, day_key);


--
-- Name: user_daily_claims user_daily_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_claims
    ADD CONSTRAINT user_daily_claims_pkey PRIMARY KEY (user_id);


--
-- Name: user_hmac_secrets user_hmac_secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_hmac_secrets
    ADD CONSTRAINT user_hmac_secrets_pkey PRIMARY KEY (user_id);


--
-- Name: user_loot_boxes user_loot_boxes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_loot_boxes
    ADD CONSTRAINT user_loot_boxes_pkey PRIMARY KEY (id);


--
-- Name: user_lucky_boxes user_lucky_boxes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lucky_boxes
    ADD CONSTRAINT user_lucky_boxes_pkey PRIMARY KEY (user_id);


--
-- Name: user_season_pass_progress user_season_pass_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_season_pass_progress
    ADD CONSTRAINT user_season_pass_progress_pkey PRIMARY KEY (id);


--
-- Name: user_season_pass_progress user_season_pass_progress_user_id_season_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_season_pass_progress
    ADD CONSTRAINT user_season_pass_progress_user_id_season_id_key UNIQUE (user_id, season_id);


--
-- Name: user_spin_history user_spin_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_spin_history
    ADD CONSTRAINT user_spin_history_pkey PRIMARY KEY (id);


--
-- Name: user_titles user_titles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_titles
    ADD CONSTRAINT user_titles_pkey PRIMARY KEY (user_id, title_key);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_pseudo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pseudo_key UNIQUE (pseudo);


--
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: users users_url_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_url_slug_key UNIQUE (url_slug);


--
-- Name: volt_credit_transactions volt_credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volt_credit_transactions
    ADD CONSTRAINT volt_credit_transactions_pkey PRIMARY KEY (id);


--
-- Name: volt_credits volt_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volt_credits
    ADD CONSTRAINT volt_credits_pkey PRIMARY KEY (user_id);


--
-- Name: volt_presence volt_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volt_presence
    ADD CONSTRAINT volt_presence_pkey PRIMARY KEY (user_id);


--
-- Name: volt_token_transactions volt_token_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volt_token_transactions
    ADD CONSTRAINT volt_token_transactions_pkey PRIMARY KEY (id);


--
-- Name: volt_tokens volt_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volt_tokens
    ADD CONSTRAINT volt_tokens_pkey PRIMARY KEY (user_id);


--
-- Name: idx_activity_feed_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_feed_actor ON public.activity_feed USING btree (actor_id, created_at DESC);


--
-- Name: idx_activity_feed_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_feed_created ON public.activity_feed USING btree (created_at DESC);


--
-- Name: idx_admin_audit_logs_admin_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_admin_created ON public.admin_audit_logs USING btree (admin_id, created_at DESC);


--
-- Name: idx_admin_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_created ON public.admin_audit_logs USING btree (created_at DESC);


--
-- Name: idx_admin_audit_logs_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_target ON public.admin_audit_logs USING btree (target_type, target_id);


--
-- Name: idx_admin_audit_logs_target_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_target_user ON public.admin_audit_logs USING btree (target_user_id, created_at DESC);


--
-- Name: idx_admin_roles_active_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_roles_active_role ON public.admin_roles USING btree (is_active, role);


--
-- Name: idx_admin_roles_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_roles_created_by ON public.admin_roles USING btree (created_by);


--
-- Name: idx_admin_roles_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_roles_updated_by ON public.admin_roles USING btree (updated_by);


--
-- Name: idx_ban_appeals_ban_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ban_appeals_ban_id ON public.ban_appeals USING btree (ban_id) WHERE (ban_id IS NOT NULL);


--
-- Name: idx_ban_appeals_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ban_appeals_reviewed_by ON public.ban_appeals USING btree (reviewed_by) WHERE (reviewed_by IS NOT NULL);


--
-- Name: idx_ban_appeals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ban_appeals_user_id ON public.ban_appeals USING btree (user_id);


--
-- Name: idx_blacklist_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blacklist_identifier ON public.blacklist USING btree (identifier);


--
-- Name: idx_broadcasts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_broadcasts_created_at ON public.broadcasts USING btree (created_at DESC);


--
-- Name: idx_broadcasts_from_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_broadcasts_from_uid ON public.broadcasts USING btree (from_uid);


--
-- Name: idx_cel_kind_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cel_kind_created ON public.client_error_logs USING btree (kind, created_at DESC);


--
-- Name: idx_cel_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cel_user_created ON public.client_error_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_credit_transfers_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_transfers_from ON public.credit_transfers USING btree (from_user_id);


--
-- Name: idx_credit_transfers_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_transfers_to ON public.credit_transfers USING btree (to_user_id);


--
-- Name: idx_credit_tx_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_tx_user_date ON public.volt_credit_transactions USING btree (user_id, created_at DESC);


--
-- Name: idx_direct_messages_chat_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_chat_sent ON public.direct_messages USING btree (chat_id, sent_at DESC);


--
-- Name: idx_direct_messages_deleted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_deleted_by ON public.direct_messages USING btree (deleted_by);


--
-- Name: idx_direct_messages_deleted_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_deleted_sent ON public.direct_messages USING btree (is_deleted, sent_at DESC);


--
-- Name: idx_direct_messages_from_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_from_uid ON public.direct_messages USING btree (from_uid);


--
-- Name: idx_direct_messages_participants_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_participants_sent ON public.direct_messages USING btree (from_uid, to_uid, sent_at DESC);


--
-- Name: idx_direct_messages_to_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_to_uid ON public.direct_messages USING btree (to_uid);


--
-- Name: idx_direct_messages_unread_to_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_unread_to_uid ON public.direct_messages USING btree (to_uid, sent_at DESC) WHERE (is_read = false);


--
-- Name: idx_dm_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_chat_id ON public.direct_messages USING btree (chat_id, sent_at DESC);


--
-- Name: idx_dm_from_to_sent_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_from_to_sent_desc ON public.direct_messages USING btree (from_uid, to_uid, sent_at DESC);


--
-- Name: idx_dm_to_uid_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_to_uid_unread ON public.direct_messages USING btree (to_uid, is_read) WHERE ((is_read = false) AND (is_deleted = false));


--
-- Name: idx_dmr_user_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dmr_user_match ON public.duel_match_results USING btree (user_id, match_id);


--
-- Name: idx_dq_random_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dq_random_created ON public.duel_random_queue USING btree (created_at);


--
-- Name: idx_dre_match_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dre_match_recorded ON public.duel_replay_events USING btree (match_id, recorded_at);


--
-- Name: idx_dre_user_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dre_user_match ON public.duel_replay_events USING btree (user_id, match_id);


--
-- Name: idx_duel_invites_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_invites_expires ON public.duel_invites USING btree (expires_at);


--
-- Name: idx_duel_invites_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_invites_receiver ON public.duel_invites USING btree (receiver_id, status);


--
-- Name: idx_duel_invites_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_invites_sender ON public.duel_invites USING btree (sender_id, status);


--
-- Name: idx_duel_invites_sender_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_invites_sender_pending ON public.duel_invites USING btree (sender_id, created_at DESC) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_duel_match_results_invalidated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_match_results_invalidated_by ON public.duel_match_results USING btree (invalidated_by);


--
-- Name: idx_duel_match_results_match_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_match_results_match_user ON public.duel_match_results USING btree (match_id, user_id);


--
-- Name: idx_duel_matches_abandoned_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_abandoned_by ON public.duel_matches USING btree (abandoned_by);


--
-- Name: idx_duel_matches_bot_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_bot_active ON public.duel_matches USING btree (is_bot_match, status, created_at DESC) WHERE (is_bot_match = true);


--
-- Name: idx_duel_matches_cancelled_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_cancelled_by ON public.duel_matches USING btree (cancelled_by);


--
-- Name: idx_duel_matches_chal_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_chal_sort ON public.duel_matches USING btree (challenger_uid, COALESCE(completed_at, accepted_at, created_at) DESC);


--
-- Name: idx_duel_matches_challenger; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_challenger ON public.duel_matches USING btree (challenger_uid, status, created_at DESC);


--
-- Name: idx_duel_matches_challenger_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_challenger_uid ON public.duel_matches USING btree (challenger_uid, created_at DESC);


--
-- Name: idx_duel_matches_elo_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_elo_processed ON public.duel_matches USING btree (status, elo_processed, completed_at DESC);


--
-- Name: idx_duel_matches_finish_reason; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_finish_reason ON public.duel_matches USING btree (finish_reason);


--
-- Name: idx_duel_matches_opp_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_opp_sort ON public.duel_matches USING btree (opponent_uid, COALESCE(completed_at, accepted_at, created_at) DESC);


--
-- Name: idx_duel_matches_opponent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_opponent ON public.duel_matches USING btree (opponent_uid, status, created_at DESC);


--
-- Name: idx_duel_matches_opponent_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_opponent_uid ON public.duel_matches USING btree (opponent_uid, created_at DESC) WHERE (opponent_uid IS NOT NULL);


--
-- Name: idx_duel_matches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_status ON public.duel_matches USING btree (status, expires_at, ends_at);


--
-- Name: idx_duel_matches_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_status_created ON public.duel_matches USING btree (status, created_at DESC);


--
-- Name: idx_duel_matches_status_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_status_date ON public.duel_matches USING btree (status, created_at DESC);


--
-- Name: idx_duel_matches_voided_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_voided_by ON public.duel_matches USING btree (voided_by);


--
-- Name: idx_duel_matches_winner_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_matches_winner_uid ON public.duel_matches USING btree (winner_uid);


--
-- Name: idx_duel_one_open_per_challenger; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_duel_one_open_per_challenger ON public.duel_matches USING btree (challenger_uid) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying])::text[]));


--
-- Name: idx_duel_one_open_per_opponent; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_duel_one_open_per_opponent ON public.duel_matches USING btree (opponent_uid) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying])::text[]));


--
-- Name: idx_duel_random_queue_mode_wager_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_random_queue_mode_wager_created ON public.duel_random_queue USING btree (mode, COALESCE(wager_tokens, wager_credits, 0), created_at);


--
-- Name: idx_duel_results_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_results_match ON public.duel_match_results USING btree (match_id);


--
-- Name: idx_duel_results_status_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_results_status_match ON public.duel_match_results USING btree (status, match_id);


--
-- Name: idx_duel_round_results_challenger_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_round_results_challenger_uid ON public.duel_round_results USING btree (challenger_uid);


--
-- Name: idx_duel_round_results_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_round_results_match ON public.duel_round_results USING btree (match_id, round_number);


--
-- Name: idx_duel_round_results_opponent_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_round_results_opponent_uid ON public.duel_round_results USING btree (opponent_uid);


--
-- Name: idx_duel_round_results_winner_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_round_results_winner_uid ON public.duel_round_results USING btree (winner_uid);


--
-- Name: idx_duel_run_states_match_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_run_states_match_user ON public.duel_run_states USING btree (match_id, user_id);


--
-- Name: idx_duel_run_states_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_run_states_seen ON public.duel_run_states USING btree (last_seen_at DESC);


--
-- Name: idx_duel_run_states_terminal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_run_states_terminal ON public.duel_run_states USING btree (match_id, state, updated_at DESC);


--
-- Name: idx_duel_token_stakes_challenger_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_token_stakes_challenger_uid ON public.duel_token_stakes USING btree (challenger_uid);


--
-- Name: idx_duel_token_stakes_opponent_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_token_stakes_opponent_uid ON public.duel_token_stakes USING btree (opponent_uid);


--
-- Name: idx_duel_token_stakes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duel_token_stakes_status ON public.duel_token_stakes USING btree (status, updated_at DESC);


--
-- Name: idx_duels_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duels_created ON public.duels USING btree (created_at DESC);


--
-- Name: idx_duels_invite_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duels_invite_id ON public.duels USING btree (invite_id);


--
-- Name: idx_duels_loser_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duels_loser_uid ON public.duels USING btree (loser_uid);


--
-- Name: idx_duels_player1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duels_player1 ON public.duels USING btree (player1_id, status);


--
-- Name: idx_duels_player2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duels_player2 ON public.duels USING btree (player2_id, status);


--
-- Name: idx_duels_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duels_status ON public.duels USING btree (status);


--
-- Name: idx_elo_history_duel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elo_history_duel ON public.elo_history USING btree (duel_id);


--
-- Name: idx_elo_history_opponent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elo_history_opponent_id ON public.elo_history USING btree (opponent_id);


--
-- Name: idx_elo_history_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elo_history_user_created ON public.elo_history USING btree (user_id, created_at DESC);


--
-- Name: idx_elo_seasons_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elo_seasons_active ON public.elo_seasons USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_elo_seasons_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elo_seasons_window ON public.elo_seasons USING btree (starts_at, ends_at);


--
-- Name: idx_esr_season_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_esr_season_rank ON public.elo_season_rewards USING btree (season_id, rank);


--
-- Name: idx_esr_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_esr_user ON public.elo_season_rewards USING btree (user_id, granted_at DESC);


--
-- Name: idx_ess_season_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ess_season_rank ON public.elo_season_snapshots USING btree (season_id, final_rank);


--
-- Name: idx_ess_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ess_user ON public.elo_season_snapshots USING btree (user_id, season_id DESC);


--
-- Name: idx_follows_followee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_followee ON public.follows USING btree (followee_id);


--
-- Name: idx_follows_follower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_follower ON public.follows USING btree (follower_id);


--
-- Name: idx_friend_req_receiver_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friend_req_receiver_status ON public.friend_requests USING btree (receiver_id, status);


--
-- Name: idx_friend_requests_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friend_requests_expires ON public.friend_requests USING btree (expires_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_friend_requests_from_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friend_requests_from_uid ON public.friend_requests USING btree (from_uid);


--
-- Name: idx_friends_friend_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friends_friend_id ON public.friends USING btree (friend_id);


--
-- Name: idx_friends_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friends_user_id ON public.friends USING btree (user_id);


--
-- Name: idx_global_chat_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_chat_created ON public.global_chat USING btree (created_at DESC);


--
-- Name: idx_global_chat_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_chat_created_at ON public.global_chat USING btree (created_at DESC);


--
-- Name: idx_global_chat_deleted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_chat_deleted_by ON public.global_chat USING btree (deleted_by);


--
-- Name: idx_global_chat_deleted_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_chat_deleted_created ON public.global_chat USING btree (is_deleted, created_at DESC);


--
-- Name: idx_global_chat_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_chat_grade ON public.global_chat USING btree (user_grade) WHERE (user_grade IS NOT NULL);


--
-- Name: idx_global_chat_reply_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_chat_reply_to ON public.global_chat USING btree (reply_to);


--
-- Name: idx_global_chat_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_chat_uid ON public.global_chat USING btree (uid);


--
-- Name: idx_global_chat_uid_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_chat_uid_created ON public.global_chat USING btree (uid, created_at DESC);


--
-- Name: idx_hwid_history_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hwid_history_user_time ON public.hwid_history USING btree (user_id, changed_at DESC);


--
-- Name: idx_ignore_list_ignored_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ignore_list_ignored_id ON public.ignore_list USING btree (ignored_id);


--
-- Name: idx_ip_bans_banned_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_bans_banned_by ON public.ip_bans USING btree (banned_by) WHERE (banned_by IS NOT NULL);


--
-- Name: idx_moderation_actions_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_actions_admin_id ON public.moderation_actions USING btree (admin_id);


--
-- Name: idx_moderation_actions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_actions_created ON public.moderation_actions USING btree (created_at DESC);


--
-- Name: idx_moderation_actions_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_actions_target ON public.moderation_actions USING btree (target_type, target_id);


--
-- Name: idx_moderation_actions_target_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_actions_target_user_id ON public.moderation_actions USING btree (target_user_id);


--
-- Name: idx_modlog_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modlog_admin_id ON public.moderation_log USING btree (admin_id);


--
-- Name: idx_modlog_target_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modlog_target_user ON public.moderation_log USING btree (target_user_id);


--
-- Name: idx_monthly_grants_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monthly_grants_user ON public.monthly_credit_grants USING btree (user_id, month_key DESC);


--
-- Name: idx_msgreact_msg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_msgreact_msg ON public.message_reactions USING btree (message_table, message_id);


--
-- Name: idx_payment_orders_provider_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payment_orders_provider_payment ON public.payment_orders USING btree (provider, provider_payment_id) WHERE (provider_payment_id IS NOT NULL);


--
-- Name: idx_payment_orders_provider_session; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payment_orders_provider_session ON public.payment_orders USING btree (provider, provider_session_id) WHERE (provider_session_id IS NOT NULL);


--
-- Name: idx_payment_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_status ON public.payment_orders USING btree (status, updated_at DESC);


--
-- Name: idx_payment_orders_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_user_created ON public.payment_orders USING btree (user_id, created_at DESC);


--
-- Name: idx_payment_webhook_events_received; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_webhook_events_received ON public.payment_webhook_events USING btree (received_at DESC);


--
-- Name: idx_player_elo_duel_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_elo_duel_rank ON public.player_elo USING btree (duel_elo DESC, wins DESC, duels_played DESC);


--
-- Name: idx_premium_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_premium_is_active ON public.premium_subscriptions USING btree (is_active, expires_at);


--
-- Name: idx_premium_subscriptions_granted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_premium_subscriptions_granted_by ON public.premium_subscriptions USING btree (granted_by);


--
-- Name: idx_premium_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_premium_user_id ON public.premium_subscriptions USING btree (user_id);


--
-- Name: idx_profile_views_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_views_profile ON public.profile_views USING btree (profile_id, viewed_at DESC);


--
-- Name: idx_profile_views_viewer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profile_views_viewer ON public.profile_views USING btree (viewer_id, viewed_at DESC) WHERE (viewer_id IS NOT NULL);


--
-- Name: idx_run_history_added_by_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_history_added_by_admin ON public.run_history USING btree (added_by_admin);


--
-- Name: idx_run_history_invalidated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_history_invalidated_by ON public.run_history USING btree (invalidated_by);


--
-- Name: idx_run_history_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_history_status_created ON public.run_history USING btree (status, created_at DESC);


--
-- Name: idx_run_history_updated_by_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_history_updated_by_admin ON public.run_history USING btree (updated_by_admin);


--
-- Name: idx_run_history_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_history_user_created ON public.run_history USING btree (user_id, created_at DESC);


--
-- Name: idx_run_history_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_history_user_date ON public.run_history USING btree (user_id, created_at DESC);


--
-- Name: idx_score_nonces_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_score_nonces_expires_at ON public.score_nonces USING btree (expires_at);


--
-- Name: idx_score_nonces_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_score_nonces_user_id ON public.score_nonces USING btree (user_id);


--
-- Name: idx_scores_added_by_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scores_added_by_admin ON public.scores USING btree (added_by_admin);


--
-- Name: idx_scores_category_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scores_category_time ON public.scores USING btree (category, "time");


--
-- Name: idx_scores_invalidated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scores_invalidated_by ON public.scores USING btree (invalidated_by);


--
-- Name: idx_scores_leaderboard; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scores_leaderboard ON public.scores USING btree ("time" DESC) WHERE ((category)::text = 'stats_elo'::text);


--
-- Name: idx_scores_stats_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_scores_stats_unique ON public.scores USING btree (user_id, category) WHERE ((category)::text <> ALL (ARRAY[('speedrun'::character varying)::text, ('no_coin'::character varying)::text]));


--
-- Name: idx_scores_updated_by_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scores_updated_by_admin ON public.scores USING btree (updated_by_admin);


--
-- Name: idx_scores_user_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scores_user_category ON public.scores USING btree (user_id, category);


--
-- Name: idx_scores_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scores_user_id ON public.scores USING btree (user_id);


--
-- Name: idx_season_snapshots_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_season_snapshots_season_id ON public.season_snapshots USING btree (season_id);


--
-- Name: idx_season_snapshots_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_season_snapshots_user_id ON public.season_snapshots USING btree (user_id);


--
-- Name: idx_subscriptions_provider_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_subscriptions_provider_sub ON public.subscriptions USING btree (provider, provider_subscription_id) WHERE (provider_subscription_id IS NOT NULL);


--
-- Name: idx_subscriptions_source_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_source_order_id ON public.subscriptions USING btree (source_order_id);


--
-- Name: idx_subscriptions_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_status ON public.subscriptions USING btree (user_id, status, current_period_end DESC);


--
-- Name: idx_tdc_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tdc_team_id ON public.team_daily_challenges USING btree (team_id);


--
-- Name: idx_team_ach_unlocks_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_ach_unlocks_team_id ON public.team_achievement_unlocks USING btree (team_id);


--
-- Name: idx_team_chat_deleted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_chat_deleted_by ON public.team_chat USING btree (deleted_by);


--
-- Name: idx_team_chat_deleted_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_chat_deleted_created ON public.team_chat USING btree (team_id, is_deleted, created_at DESC);


--
-- Name: idx_team_chat_team_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_chat_team_date ON public.team_chat USING btree (team_id, created_at DESC);


--
-- Name: idx_team_chat_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_chat_uid ON public.team_chat USING btree (uid);


--
-- Name: idx_team_credit_txn_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_credit_txn_team_id ON public.team_credit_transactions USING btree (team_id, created_at DESC);


--
-- Name: idx_team_credit_txn_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_credit_txn_user_id ON public.team_credit_transactions USING btree (user_id);


--
-- Name: idx_team_invite_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_team_invite_unique ON public.team_invites USING btree (team_id, to_uid) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_team_invites_from_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_invites_from_uid ON public.team_invites USING btree (from_uid);


--
-- Name: idx_team_invites_to_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_invites_to_uid ON public.team_invites USING btree (to_uid, status);


--
-- Name: idx_team_members_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_user ON public.team_members USING btree (user_id);


--
-- Name: idx_team_requests_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_requests_team ON public.team_requests USING btree (team_id, status);


--
-- Name: idx_team_wars_team_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_wars_team_a ON public.team_wars USING btree (team_a_id);


--
-- Name: idx_team_wars_team_b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_wars_team_b ON public.team_wars USING btree (team_b_id);


--
-- Name: idx_team_wars_winner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_wars_winner ON public.team_wars USING btree (winner_team_id) WHERE (winner_team_id IS NOT NULL);


--
-- Name: idx_teams_deleted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_deleted_by ON public.teams USING btree (deleted_by);


--
-- Name: idx_teams_deleted_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_deleted_created ON public.teams USING btree (is_deleted, created_at DESC);


--
-- Name: idx_teams_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_owner_id ON public.teams USING btree (owner_id);


--
-- Name: idx_tm_tournament_round; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tm_tournament_round ON public.tournament_matches USING btree (tournament_id, round);


--
-- Name: idx_tournament_matches_duel_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournament_matches_duel_match_id ON public.tournament_matches USING btree (duel_match_id);


--
-- Name: idx_tournament_matches_player_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournament_matches_player_a ON public.tournament_matches USING btree (player_a);


--
-- Name: idx_tournament_matches_player_b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournament_matches_player_b ON public.tournament_matches USING btree (player_b);


--
-- Name: idx_tournament_matches_winner_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournament_matches_winner_uid ON public.tournament_matches USING btree (winner_uid);


--
-- Name: idx_tournaments_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournaments_created_by ON public.tournaments USING btree (created_by);


--
-- Name: idx_tp_tournament_seed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tp_tournament_seed ON public.tournament_participants USING btree (tournament_id, seed);


--
-- Name: idx_tp_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tp_user ON public.tournament_participants USING btree (user_id);


--
-- Name: idx_ua_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ua_user ON public.user_achievements USING btree (user_id, unlocked_at DESC);


--
-- Name: idx_unique_friend_request; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_friend_request ON public.friend_requests USING btree (LEAST(from_uid, receiver_id), GREATEST(from_uid, receiver_id));


--
-- Name: idx_user_achievements_achievement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_achievements_achievement_id ON public.user_achievements USING btree (achievement_id);


--
-- Name: idx_user_bans_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bans_created ON public.user_bans USING btree (created_at DESC);


--
-- Name: idx_user_bans_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bans_created_by ON public.user_bans USING btree (created_by);


--
-- Name: idx_user_bans_lifted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bans_lifted_by ON public.user_bans USING btree (lifted_by);


--
-- Name: idx_user_bans_user_type_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bans_user_type_active ON public.user_bans USING btree (user_id, ban_type, is_active, expires_at);


--
-- Name: idx_user_blocks_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_blocks_blocked ON public.user_blocks USING btree (blocked_uid, kind);


--
-- Name: idx_user_blocks_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_blocks_expires ON public.user_blocks USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_user_blocks_user_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_blocks_user_kind ON public.user_blocks USING btree (user_id, kind);


--
-- Name: idx_user_challenges_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_challenges_day ON public.user_daily_challenges USING btree (user_id, day_key);


--
-- Name: idx_user_loot_boxes_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_loot_boxes_uid ON public.user_loot_boxes USING btree (user_id, opened_at DESC);


--
-- Name: idx_user_spin_history_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_spin_history_item_id ON public.user_spin_history USING btree (item_id);


--
-- Name: idx_user_spin_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_spin_history_user_id ON public.user_spin_history USING btree (user_id);


--
-- Name: idx_user_titles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_titles_user_id ON public.user_titles USING btree (user_id);


--
-- Name: idx_users_auth_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_auth_provider ON public.users USING btree (auth_provider) WHERE (auth_provider IS NOT NULL);


--
-- Name: idx_users_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_users_email_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email_lower ON public.users USING btree (lower((email)::text));


--
-- Name: idx_users_pseudo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_pseudo ON public.users USING btree (pseudo text_pattern_ops);


--
-- Name: idx_users_pseudo_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_pseudo_lower ON public.users USING btree (lower((pseudo)::text));


--
-- Name: idx_users_referral_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_referral_code ON public.users USING btree (referral_code) WHERE (referral_code IS NOT NULL);


--
-- Name: idx_users_status_text; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status_text ON public.users USING btree (id) WHERE (status_text IS NOT NULL);


--
-- Name: idx_users_suspicion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_suspicion ON public.users USING btree (suspicion_score) WHERE (suspicion_score > 0);


--
-- Name: idx_users_url_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_url_slug ON public.users USING btree (url_slug) WHERE (url_slug IS NOT NULL);


--
-- Name: idx_uspp_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uspp_user_id ON public.user_season_pass_progress USING btree (user_id);


--
-- Name: idx_volt_presence_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_volt_presence_user ON public.volt_presence USING btree (user_id);


--
-- Name: idx_volt_token_transactions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_volt_token_transactions_created_by ON public.volt_token_transactions USING btree (created_by);


--
-- Name: idx_volt_token_transactions_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_volt_token_transactions_user_created ON public.volt_token_transactions USING btree (user_id, created_at DESC);


--
-- Name: score_signatures_submitted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX score_signatures_submitted_at_idx ON public.score_signatures USING btree (submitted_at DESC);


--
-- Name: score_signatures_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX score_signatures_user_id_idx ON public.score_signatures USING btree (user_id);


--
-- Name: uniq_profile_views_per_day; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_profile_views_per_day ON public.profile_views USING btree (profile_id, viewer_id, viewed_day) WHERE (viewer_id IS NOT NULL);


--
-- Name: admin_roles trg_admin_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_roles_updated_at BEFORE UPDATE ON public.admin_roles FOR EACH ROW EXECUTE FUNCTION public.admin_touch_updated_at();


--
-- Name: users trg_auto_provision_hmac_secret; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_provision_hmac_secret AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.auto_provision_hmac_secret();


--
-- Name: duel_matches trg_bot_wager_zero; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bot_wager_zero BEFORE INSERT OR UPDATE ON public.duel_matches FOR EACH ROW EXECUTE FUNCTION public.enforce_bot_wager_zero();


--
-- Name: friends trg_delete_reverse_friendship; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_delete_reverse_friendship AFTER DELETE ON public.friends FOR EACH ROW EXECUTE FUNCTION public.delete_reverse_friendship();


--
-- Name: duel_matches trg_duel_invite_rate_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_duel_invite_rate_limit BEFORE INSERT ON public.duel_matches FOR EACH ROW EXECUTE FUNCTION public.enforce_duel_invite_rate_limit();


--
-- Name: duel_matches trg_duel_pair_cooldown; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_duel_pair_cooldown BEFORE INSERT ON public.duel_matches FOR EACH ROW EXECUTE FUNCTION public.enforce_duel_pair_cooldown();


--
-- Name: duel_matches trg_duel_respond_caller_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_duel_respond_caller_lock BEFORE UPDATE OF status ON public.duel_matches FOR EACH ROW EXECUTE FUNCTION public.duel_respond_caller_lock();


--
-- Name: direct_messages trg_enforce_ban_direct_messages; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_ban_direct_messages BEFORE INSERT OR UPDATE ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_active_category_bans();


--
-- Name: duel_match_results trg_enforce_ban_duel_match_results; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_ban_duel_match_results BEFORE INSERT OR UPDATE ON public.duel_match_results FOR EACH ROW EXECUTE FUNCTION public.enforce_active_category_bans();


--
-- Name: duel_matches trg_enforce_ban_duel_matches; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_ban_duel_matches BEFORE INSERT OR UPDATE ON public.duel_matches FOR EACH ROW EXECUTE FUNCTION public.enforce_active_category_bans();


--
-- Name: duel_run_states trg_enforce_ban_duel_run_states; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_ban_duel_run_states BEFORE INSERT OR UPDATE ON public.duel_run_states FOR EACH ROW EXECUTE FUNCTION public.enforce_active_category_bans();


--
-- Name: global_chat trg_enforce_ban_global_chat; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_ban_global_chat BEFORE INSERT OR UPDATE ON public.global_chat FOR EACH ROW EXECUTE FUNCTION public.enforce_active_category_bans();


--
-- Name: run_history trg_enforce_ban_run_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_ban_run_history BEFORE INSERT OR UPDATE ON public.run_history FOR EACH ROW EXECUTE FUNCTION public.enforce_active_category_bans();


--
-- Name: scores trg_enforce_ban_scores; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_ban_scores BEFORE INSERT OR UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.enforce_active_category_bans();


--
-- Name: team_chat trg_enforce_ban_team_chat; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_ban_team_chat BEFORE INSERT OR UPDATE ON public.team_chat FOR EACH ROW EXECUTE FUNCTION public.enforce_active_category_bans();


--
-- Name: team_members trg_enforce_ban_team_members; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_ban_team_members BEFORE INSERT OR UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.enforce_active_category_bans();


--
-- Name: teams trg_enforce_ban_teams; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_ban_teams BEFORE INSERT OR UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.enforce_active_category_bans();


--
-- Name: direct_messages trg_enforce_dm_rate_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_dm_rate_limit BEFORE INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_dm_rate_limit();


--
-- Name: duel_matches trg_enforce_duel_block_pair; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_duel_block_pair BEFORE INSERT ON public.duel_matches FOR EACH ROW EXECUTE FUNCTION public.enforce_duel_block_pair();


--
-- Name: users trg_enforce_email_from_auth; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_email_from_auth BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.enforce_email_from_auth();


--
-- Name: scores trg_enforce_score_category_bounds; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_score_category_bounds BEFORE INSERT ON public.scores FOR EACH ROW EXECUTE FUNCTION public.enforce_score_category_bounds();


--
-- Name: global_chat trg_enforce_slowmode; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_slowmode BEFORE INSERT ON public.global_chat FOR EACH ROW EXECUTE FUNCTION public.enforce_global_chat_slowmode();


--
-- Name: team_members trg_enforce_team_member_max; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_team_member_max BEFORE INSERT ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.enforce_team_member_max();


--
-- Name: direct_messages trg_ensure_valid_chat_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ensure_valid_chat_id BEFORE INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.generate_chat_id();


--
-- Name: duel_matches trg_flag_suspicious_duel; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_flag_suspicious_duel AFTER UPDATE OF status ON public.duel_matches FOR EACH ROW EXECUTE FUNCTION public.flag_suspicious_duel();


--
-- Name: friend_requests trg_friend_request_rate_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_friend_request_rate_limit BEFORE INSERT ON public.friend_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_friend_request_rate_limit();


--
-- Name: duel_matches trg_guard_elo_processed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_elo_processed BEFORE UPDATE OF elo_processed ON public.duel_matches FOR EACH ROW EXECUTE FUNCTION public.guard_elo_processed_flag();


--
-- Name: users trg_hwid_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hwid_change BEFORE UPDATE OF hwid ON public.users FOR EACH ROW EXECUTE FUNCTION public.track_hwid_change();


--
-- Name: global_chat trg_inject_grade_chat; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inject_grade_chat BEFORE INSERT ON public.global_chat FOR EACH ROW EXECUTE FUNCTION public.inject_grade_into_chat();


--
-- Name: users trg_lock_hwid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_lock_hwid BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.lock_hwid_on_update();


--
-- Name: users trg_prevent_role_escalation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_role_escalation BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();


--
-- Name: users trg_referral_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_referral_code BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();


--
-- Name: run_history trg_run_history_rate_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_run_history_rate_limit BEFORE INSERT ON public.run_history FOR EACH ROW EXECUTE FUNCTION public.check_run_history_rate_limit();


--
-- Name: scores trg_score_rate_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_score_rate_limit BEFORE INSERT ON public.scores FOR EACH ROW EXECUTE FUNCTION public.check_score_rate_limit();


--
-- Name: scores trg_score_sanity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_score_sanity BEFORE INSERT OR UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.check_score_sanity();


--
-- Name: broadcasts trg_set_broadcast_pseudo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_broadcast_pseudo BEFORE INSERT ON public.broadcasts FOR EACH ROW EXECUTE FUNCTION public.set_correct_pseudo();


--
-- Name: direct_messages trg_set_dm_pseudo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_dm_pseudo BEFORE INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.set_correct_pseudo();


--
-- Name: friends trg_set_friend_pseudo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_friend_pseudo BEFORE INSERT ON public.friends FOR EACH ROW EXECUTE FUNCTION public.set_correct_pseudo();


--
-- Name: friend_requests trg_set_friend_request_pseudo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_friend_request_pseudo BEFORE INSERT ON public.friend_requests FOR EACH ROW EXECUTE FUNCTION public.set_correct_pseudo();


--
-- Name: global_chat trg_set_global_chat_pseudo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_global_chat_pseudo BEFORE INSERT ON public.global_chat FOR EACH ROW EXECUTE FUNCTION public.set_correct_pseudo();


--
-- Name: team_chat trg_set_team_chat_pseudo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_team_chat_pseudo BEFORE INSERT ON public.team_chat FOR EACH ROW EXECUTE FUNCTION public.set_team_chat_pseudo();


--
-- Name: users trg_strip_client_hwid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_strip_client_hwid BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.strip_client_hwid();


--
-- Name: duel_matches trg_sync_duel_token_stake; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_duel_token_stake AFTER INSERT OR UPDATE OF status, wager_tokens, wager_credits, challenger_token_escrow, opponent_token_escrow, challenger_escrow, opponent_escrow, accepted_at ON public.duel_matches FOR EACH ROW EXECUTE FUNCTION public.sync_duel_token_stake();


--
-- Name: run_history trg_team_war_score; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_team_war_score AFTER INSERT ON public.run_history FOR EACH ROW EXECUTE FUNCTION public.update_team_war_score();


--
-- Name: teams trg_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_bans trg_user_bans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_bans_updated_at BEFORE UPDATE ON public.user_bans FOR EACH ROW EXECUTE FUNCTION public.admin_touch_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: duel_matches trg_volt_apply_duel_elo_on_completed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_volt_apply_duel_elo_on_completed AFTER UPDATE OF status ON public.duel_matches FOR EACH ROW WHEN ((((new.status)::text = 'completed'::text) AND ((old.status)::text IS DISTINCT FROM (new.status)::text))) EXECUTE FUNCTION public.volt_apply_duel_elo_on_completed();


--
-- Name: volt_credits trg_volt_credits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_volt_credits_updated_at BEFORE UPDATE ON public.volt_credits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: activity_feed activity_feed_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_feed
    ADD CONSTRAINT activity_feed_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: admin_audit_logs admin_audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: admin_audit_logs admin_audit_logs_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: admin_roles admin_roles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: admin_roles admin_roles_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: admin_roles admin_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ban_appeals ban_appeals_ban_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ban_appeals
    ADD CONSTRAINT ban_appeals_ban_id_fkey FOREIGN KEY (ban_id) REFERENCES public.user_bans(id);


--
-- Name: ban_appeals ban_appeals_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ban_appeals
    ADD CONSTRAINT ban_appeals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: ban_appeals ban_appeals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ban_appeals
    ADD CONSTRAINT ban_appeals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: broadcasts broadcasts_from_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_from_uid_fkey FOREIGN KEY (from_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: client_error_logs client_error_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_error_logs
    ADD CONSTRAINT client_error_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: credit_transfers credit_transfers_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transfers
    ADD CONSTRAINT credit_transfers_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id);


--
-- Name: credit_transfers credit_transfers_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transfers
    ADD CONSTRAINT credit_transfers_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id);


--
-- Name: daily_login_streaks daily_login_streaks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_login_streaks
    ADD CONSTRAINT daily_login_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_from_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_from_uid_fkey FOREIGN KEY (from_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_to_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_to_uid_fkey FOREIGN KEY (to_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_invites duel_invites_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_invites
    ADD CONSTRAINT duel_invites_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_invites duel_invites_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_invites
    ADD CONSTRAINT duel_invites_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_match_results duel_match_results_invalidated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_match_results
    ADD CONSTRAINT duel_match_results_invalidated_by_fkey FOREIGN KEY (invalidated_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_match_results duel_match_results_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_match_results
    ADD CONSTRAINT duel_match_results_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.duel_matches(id) ON DELETE CASCADE;


--
-- Name: duel_match_results duel_match_results_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_match_results
    ADD CONSTRAINT duel_match_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_matches duel_matches_abandoned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_matches
    ADD CONSTRAINT duel_matches_abandoned_by_fkey FOREIGN KEY (abandoned_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_matches duel_matches_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_matches
    ADD CONSTRAINT duel_matches_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_matches duel_matches_challenger_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_matches
    ADD CONSTRAINT duel_matches_challenger_uid_fkey FOREIGN KEY (challenger_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_matches duel_matches_opponent_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_matches
    ADD CONSTRAINT duel_matches_opponent_uid_fkey FOREIGN KEY (opponent_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_matches duel_matches_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_matches
    ADD CONSTRAINT duel_matches_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_matches duel_matches_winner_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_matches
    ADD CONSTRAINT duel_matches_winner_uid_fkey FOREIGN KEY (winner_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_random_queue duel_random_queue_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_random_queue
    ADD CONSTRAINT duel_random_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_replay_events duel_replay_events_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_replay_events
    ADD CONSTRAINT duel_replay_events_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.duel_matches(id) ON DELETE CASCADE;


--
-- Name: duel_replay_events duel_replay_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_replay_events
    ADD CONSTRAINT duel_replay_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_round_results duel_round_results_challenger_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_round_results
    ADD CONSTRAINT duel_round_results_challenger_uid_fkey FOREIGN KEY (challenger_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_round_results duel_round_results_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_round_results
    ADD CONSTRAINT duel_round_results_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.duel_matches(id) ON DELETE CASCADE;


--
-- Name: duel_round_results duel_round_results_opponent_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_round_results
    ADD CONSTRAINT duel_round_results_opponent_uid_fkey FOREIGN KEY (opponent_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_round_results duel_round_results_winner_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_round_results
    ADD CONSTRAINT duel_round_results_winner_uid_fkey FOREIGN KEY (winner_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_run_states duel_run_states_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_run_states
    ADD CONSTRAINT duel_run_states_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.duel_matches(id) ON DELETE CASCADE;


--
-- Name: duel_run_states duel_run_states_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_run_states
    ADD CONSTRAINT duel_run_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_token_stakes duel_token_stakes_challenger_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_token_stakes
    ADD CONSTRAINT duel_token_stakes_challenger_uid_fkey FOREIGN KEY (challenger_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duel_token_stakes duel_token_stakes_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_token_stakes
    ADD CONSTRAINT duel_token_stakes_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.duel_matches(id) ON DELETE CASCADE;


--
-- Name: duel_token_stakes duel_token_stakes_opponent_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duel_token_stakes
    ADD CONSTRAINT duel_token_stakes_opponent_uid_fkey FOREIGN KEY (opponent_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duels duels_invite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duels
    ADD CONSTRAINT duels_invite_id_fkey FOREIGN KEY (invite_id) REFERENCES public.duel_invites(id) ON DELETE SET NULL;


--
-- Name: duels duels_loser_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duels
    ADD CONSTRAINT duels_loser_uid_fkey FOREIGN KEY (loser_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duels duels_player1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duels
    ADD CONSTRAINT duels_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: duels duels_player2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duels
    ADD CONSTRAINT duels_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: elo_history elo_history_duel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_history
    ADD CONSTRAINT elo_history_duel_id_fkey FOREIGN KEY (duel_id) REFERENCES public.duel_matches(id) ON DELETE SET NULL;


--
-- Name: elo_history elo_history_opponent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_history
    ADD CONSTRAINT elo_history_opponent_id_fkey FOREIGN KEY (opponent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: elo_history elo_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_history
    ADD CONSTRAINT elo_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: elo_season_rewards elo_season_rewards_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_season_rewards
    ADD CONSTRAINT elo_season_rewards_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.elo_seasons(id) ON DELETE CASCADE;


--
-- Name: elo_season_rewards elo_season_rewards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_season_rewards
    ADD CONSTRAINT elo_season_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: elo_season_snapshots elo_season_snapshots_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_season_snapshots
    ADD CONSTRAINT elo_season_snapshots_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.elo_seasons(id) ON DELETE CASCADE;


--
-- Name: elo_season_snapshots elo_season_snapshots_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elo_season_snapshots
    ADD CONSTRAINT elo_season_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_followee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_followee_id_fkey FOREIGN KEY (followee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_from_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_from_uid_fkey FOREIGN KEY (from_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friends friends_friend_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friends friends_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: global_chat global_chat_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_chat
    ADD CONSTRAINT global_chat_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: global_chat global_chat_reply_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_chat
    ADD CONSTRAINT global_chat_reply_to_fkey FOREIGN KEY (reply_to) REFERENCES public.global_chat(id) ON DELETE SET NULL;


--
-- Name: global_chat global_chat_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_chat
    ADD CONSTRAINT global_chat_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ignore_list ignore_list_ignored_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ignore_list
    ADD CONSTRAINT ignore_list_ignored_id_fkey FOREIGN KEY (ignored_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ignore_list ignore_list_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ignore_list
    ADD CONSTRAINT ignore_list_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ip_bans ip_bans_banned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_bans
    ADD CONSTRAINT ip_bans_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.users(id);


--
-- Name: message_reactions message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: moderation_actions moderation_actions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: moderation_actions moderation_actions_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: moderation_log moderation_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_log
    ADD CONSTRAINT moderation_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- Name: moderation_log moderation_log_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_log
    ADD CONSTRAINT moderation_log_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id);


--
-- Name: monthly_credit_grants monthly_credit_grants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_credit_grants
    ADD CONSTRAINT monthly_credit_grants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payment_orders payment_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: player_elo player_elo_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_elo
    ADD CONSTRAINT player_elo_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: premium_subscriptions premium_subscriptions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.premium_subscriptions
    ADD CONSTRAINT premium_subscriptions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: premium_subscriptions premium_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.premium_subscriptions
    ADD CONSTRAINT premium_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profile_views profile_views_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_views
    ADD CONSTRAINT profile_views_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profile_views profile_views_viewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_views
    ADD CONSTRAINT profile_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: run_history run_history_added_by_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_history
    ADD CONSTRAINT run_history_added_by_admin_fkey FOREIGN KEY (added_by_admin) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: run_history run_history_invalidated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_history
    ADD CONSTRAINT run_history_invalidated_by_fkey FOREIGN KEY (invalidated_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: run_history run_history_updated_by_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_history
    ADD CONSTRAINT run_history_updated_by_admin_fkey FOREIGN KEY (updated_by_admin) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: run_history run_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_history
    ADD CONSTRAINT run_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: score_nonces score_nonces_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_nonces
    ADD CONSTRAINT score_nonces_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: score_signatures score_signatures_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_signatures
    ADD CONSTRAINT score_signatures_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: scores scores_added_by_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_added_by_admin_fkey FOREIGN KEY (added_by_admin) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scores scores_invalidated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_invalidated_by_fkey FOREIGN KEY (invalidated_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scores scores_updated_by_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_updated_by_admin_fkey FOREIGN KEY (updated_by_admin) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scores scores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: season_pass_nodes season_pass_nodes_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_pass_nodes
    ADD CONSTRAINT season_pass_nodes_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: season_snapshots season_snapshots_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_snapshots
    ADD CONSTRAINT season_snapshots_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: season_snapshots season_snapshots_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_snapshots
    ADD CONSTRAINT season_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_source_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_source_order_id_fkey FOREIGN KEY (source_order_id) REFERENCES public.payment_orders(id) ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_achievement_unlocks team_achievement_unlocks_achievement_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_achievement_unlocks
    ADD CONSTRAINT team_achievement_unlocks_achievement_key_fkey FOREIGN KEY (achievement_key) REFERENCES public.team_achievements(key) ON DELETE CASCADE;


--
-- Name: team_achievement_unlocks team_achievement_unlocks_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_achievement_unlocks
    ADD CONSTRAINT team_achievement_unlocks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_chat team_chat_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_chat
    ADD CONSTRAINT team_chat_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_chat team_chat_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_chat
    ADD CONSTRAINT team_chat_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_chat team_chat_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_chat
    ADD CONSTRAINT team_chat_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_credit_bank team_credit_bank_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_credit_bank
    ADD CONSTRAINT team_credit_bank_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_credit_transactions team_credit_transactions_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_credit_transactions
    ADD CONSTRAINT team_credit_transactions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_credit_transactions team_credit_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_credit_transactions
    ADD CONSTRAINT team_credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: team_daily_challenges team_daily_challenges_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_daily_challenges
    ADD CONSTRAINT team_daily_challenges_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_invites team_invites_from_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_from_uid_fkey FOREIGN KEY (from_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_invites team_invites_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_invites team_invites_to_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_to_uid_fkey FOREIGN KEY (to_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_requests team_requests_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_requests
    ADD CONSTRAINT team_requests_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_requests team_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_requests
    ADD CONSTRAINT team_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_wars team_wars_team_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_wars
    ADD CONSTRAINT team_wars_team_a_id_fkey FOREIGN KEY (team_a_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_wars team_wars_team_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_wars
    ADD CONSTRAINT team_wars_team_b_id_fkey FOREIGN KEY (team_b_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_wars team_wars_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_wars
    ADD CONSTRAINT team_wars_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id);


--
-- Name: teams teams_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tournament_matches tournament_matches_duel_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_duel_match_id_fkey FOREIGN KEY (duel_match_id) REFERENCES public.duel_matches(id) ON DELETE SET NULL;


--
-- Name: tournament_matches tournament_matches_player_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_player_a_fkey FOREIGN KEY (player_a) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tournament_matches tournament_matches_player_b_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_player_b_fkey FOREIGN KEY (player_b) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tournament_matches tournament_matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournament_matches tournament_matches_winner_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_winner_uid_fkey FOREIGN KEY (winner_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tournament_participants tournament_participants_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_participants
    ADD CONSTRAINT tournament_participants_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournament_participants tournament_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_participants
    ADD CONSTRAINT tournament_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tournaments tournaments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_bans user_bans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_bans
    ADD CONSTRAINT user_bans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_bans user_bans_lifted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_bans
    ADD CONSTRAINT user_bans_lifted_by_fkey FOREIGN KEY (lifted_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_bans user_bans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_bans
    ADD CONSTRAINT user_bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocked_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocked_uid_fkey FOREIGN KEY (blocked_uid) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_daily_challenges user_daily_challenges_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_challenges
    ADD CONSTRAINT user_daily_challenges_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.daily_challenges(id) ON DELETE CASCADE;


--
-- Name: user_daily_challenges user_daily_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_challenges
    ADD CONSTRAINT user_daily_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_daily_claims user_daily_claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_claims
    ADD CONSTRAINT user_daily_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_hmac_secrets user_hmac_secrets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_hmac_secrets
    ADD CONSTRAINT user_hmac_secrets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_loot_boxes user_loot_boxes_box_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_loot_boxes
    ADD CONSTRAINT user_loot_boxes_box_type_fkey FOREIGN KEY (box_type) REFERENCES public.loot_box_catalog(id);


--
-- Name: user_loot_boxes user_loot_boxes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_loot_boxes
    ADD CONSTRAINT user_loot_boxes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_lucky_boxes user_lucky_boxes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lucky_boxes
    ADD CONSTRAINT user_lucky_boxes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_season_pass_progress user_season_pass_progress_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_season_pass_progress
    ADD CONSTRAINT user_season_pass_progress_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id);


--
-- Name: user_season_pass_progress user_season_pass_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_season_pass_progress
    ADD CONSTRAINT user_season_pass_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_spin_history user_spin_history_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_spin_history
    ADD CONSTRAINT user_spin_history_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.spin_wheel_items(id);


--
-- Name: user_spin_history user_spin_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_spin_history
    ADD CONSTRAINT user_spin_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_titles user_titles_title_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_titles
    ADD CONSTRAINT user_titles_title_key_fkey FOREIGN KEY (title_key) REFERENCES public.titles(key) ON DELETE CASCADE;


--
-- Name: user_titles user_titles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_titles
    ADD CONSTRAINT user_titles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: users users_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id);


--
-- Name: volt_credit_transactions volt_credit_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volt_credit_transactions
    ADD CONSTRAINT volt_credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: volt_credits volt_credits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volt_credits
    ADD CONSTRAINT volt_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: volt_presence volt_presence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volt_presence
    ADD CONSTRAINT volt_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: volt_token_transactions volt_token_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volt_token_transactions
    ADD CONSTRAINT volt_token_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: volt_token_transactions volt_token_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volt_token_transactions
    ADD CONSTRAINT volt_token_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: volt_tokens volt_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volt_tokens
    ADD CONSTRAINT volt_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: direct_messages Access DMs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Access DMs" ON public.direct_messages FOR SELECT USING ((((auth.uid() = from_uid) OR (auth.uid() = to_uid)) AND (COALESCE(is_deleted, false) = false)));


--
-- Name: scores Admin Delete Scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin Delete Scores" ON public.scores FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: premium_subscriptions Admin Insert Subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin Insert Subscriptions" ON public.premium_subscriptions FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: admin_audit_logs AdminAudit: admin read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "AdminAudit: admin read" ON public.admin_audit_logs FOR SELECT USING (public.has_admin_permission('view_logs'::text));


--
-- Name: admin_roles AdminRoles: admin read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "AdminRoles: admin read" ON public.admin_roles FOR SELECT USING (public.is_admin());


--
-- Name: blacklist Admins can insert into blacklist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert into blacklist" ON public.blacklist FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: users Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.users FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: blacklist Admins only read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins only read access" ON public.blacklist FOR SELECT USING (public.is_admin());


--
-- Name: config Allow public read access to config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to config" ON public.config FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: broadcasts Broadcasts: authenticated read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Broadcasts: authenticated read" ON public.broadcasts FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: daily_challenges Challenges: public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Challenges: public read" ON public.daily_challenges FOR SELECT USING (((is_active = true) OR public.is_admin()));


--
-- Name: friend_requests Create Friend Requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Create Friend Requests" ON public.friend_requests FOR INSERT WITH CHECK (((auth.uid() = from_uid) AND (NOT public.is_banned())));


--
-- Name: volt_credit_transactions CreditTx: own read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CreditTx: own read" ON public.volt_credit_transactions FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: volt_credits Credits: own read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Credits: own read" ON public.volt_credits FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: friend_requests Delete Friend Requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delete Friend Requests" ON public.friend_requests FOR DELETE USING (((( SELECT auth.uid() AS uid) = receiver_id) OR (( SELECT auth.uid() AS uid) = from_uid)));


--
-- Name: friends Delete Own Friends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delete Own Friends" ON public.friends FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: duel_round_results Duel round results participants read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Duel round results participants read" ON public.duel_round_results FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.duel_matches d
  WHERE ((d.id = duel_round_results.match_id) AND ((d.challenger_uid = auth.uid()) OR (d.opponent_uid = auth.uid()) OR public.is_admin())))));


--
-- Name: duel_random_queue DuelRandomQueue: own read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "DuelRandomQueue: own read" ON public.duel_random_queue FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: duel_match_results DuelResults: participant read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "DuelResults: participant read" ON public.duel_match_results FOR SELECT USING (((COALESCE(status, 'valid'::text) = 'valid'::text) AND (EXISTS ( SELECT 1
   FROM public.duel_matches d
  WHERE ((d.id = duel_match_results.match_id) AND ((d.challenger_uid = auth.uid()) OR (d.opponent_uid = auth.uid())))))));


--
-- Name: duel_run_states DuelRunStates: participant read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "DuelRunStates: participant read" ON public.duel_run_states FOR SELECT USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.duel_matches d
  WHERE ((d.id = duel_run_states.match_id) AND ((d.challenger_uid = auth.uid()) OR (d.opponent_uid = auth.uid())))))));


--
-- Name: duel_matches Duels: participant read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Duels: participant read" ON public.duel_matches FOR SELECT USING (((auth.uid() = challenger_uid) OR (auth.uid() = opponent_uid) OR public.has_admin_permission('manage_duels'::text)));


--
-- Name: friends Insert Own Friends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Insert Own Friends" ON public.friends FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: direct_messages Mark own received DMs read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mark own received DMs read" ON public.direct_messages FOR UPDATE USING ((( SELECT auth.uid() AS uid) = to_uid)) WITH CHECK ((( SELECT auth.uid() AS uid) = to_uid));


--
-- Name: moderation_actions ModerationActions: admin read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "ModerationActions: admin read" ON public.moderation_actions FOR SELECT USING (public.has_admin_permission('view_logs'::text));


--
-- Name: monthly_credit_grants MonthlyGrants: own read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "MonthlyGrants: own read" ON public.monthly_credit_grants FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: premium_subscriptions Own Subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Own Subscriptions" ON public.premium_subscriptions FOR SELECT USING (((( SELECT auth.uid() AS uid) = user_id) OR public.is_admin()));


--
-- Name: premium_emojis Public Read Emojis; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Emojis" ON public.premium_emojis FOR SELECT USING ((is_active = true));


--
-- Name: scores Public Read Scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Scores" ON public.scores FOR SELECT USING (((auth.uid() IS NOT NULL) AND (COALESCE(status, 'valid'::text) = 'valid'::text)));


--
-- Name: global_chat Read Chat; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read Chat" ON public.global_chat FOR SELECT USING (((auth.uid() IS NOT NULL) AND (COALESCE(is_deleted, false) = false)));


--
-- Name: friend_requests Read Friend Requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read Friend Requests" ON public.friend_requests FOR SELECT USING (((( SELECT auth.uid() AS uid) = from_uid) OR (( SELECT auth.uid() AS uid) = receiver_id)));


--
-- Name: friends Read Own Friends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read Own Friends" ON public.friends FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: users Read Own Profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read Own Profile" ON public.users FOR SELECT USING (((auth.uid() = id) OR public.is_admin()));


--
-- Name: run_history Read Own Run History; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read Own Run History" ON public.run_history FOR SELECT USING (((auth.uid() = user_id) AND (COALESCE(status, 'valid'::text) = 'valid'::text)));


--
-- Name: duels Read own duels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read own duels" ON public.duels FOR SELECT USING (((( SELECT auth.uid() AS uid) = player1_id) OR (( SELECT auth.uid() AS uid) = player2_id)));


--
-- Name: duel_invites Read own invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read own invites" ON public.duel_invites FOR SELECT USING (((( SELECT auth.uid() AS uid) = sender_id) OR (( SELECT auth.uid() AS uid) = receiver_id)));


--
-- Name: users Self-Edit Profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Self-Edit Profile" ON public.users FOR UPDATE USING ((( SELECT auth.uid() AS uid) = id)) WITH CHECK (((( SELECT auth.uid() AS uid) = id) AND (((role)::text = 'user'::text) OR public.is_admin())));


--
-- Name: users Self-Insert Profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Self-Insert Profile" ON public.users FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = id));


--
-- Name: direct_messages Send DMs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Send DMs" ON public.direct_messages FOR INSERT WITH CHECK (((auth.uid() = from_uid) AND (from_uid <> to_uid) AND (NOT public.is_banned()) AND (NOT public.has_active_ban(auth.uid(), 'chat'::text))));


--
-- Name: team_chat TeamChat: members insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "TeamChat: members insert" ON public.team_chat FOR INSERT WITH CHECK (((auth.uid() = uid) AND (NOT public.is_banned()) AND (NOT public.has_active_ban(auth.uid(), 'chat'::text)) AND (NOT public.has_active_ban(auth.uid(), 'clans'::text)) AND (EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_chat.team_id) AND (team_members.user_id = auth.uid()))))));


--
-- Name: team_chat TeamChat: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "TeamChat: members read" ON public.team_chat FOR SELECT USING (((COALESCE(is_deleted, false) = false) AND (EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_chat.team_id) AND (team_members.user_id = auth.uid()))))));


--
-- Name: team_invites TeamInvites: own read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "TeamInvites: own read" ON public.team_invites FOR SELECT USING (((auth.uid() = to_uid) OR (auth.uid() = from_uid) OR public.is_admin()));


--
-- Name: team_requests TeamRequests: manager update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "TeamRequests: manager update" ON public.team_requests FOR UPDATE USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_requests.team_id) AND (team_members.user_id = auth.uid()) AND ((team_members.role)::text = ANY ((ARRAY['owner'::character varying, 'officer'::character varying])::text[]))))))) WITH CHECK ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_requests.team_id) AND (team_members.user_id = auth.uid()) AND ((team_members.role)::text = ANY ((ARRAY['owner'::character varying, 'officer'::character varying])::text[])))))));


--
-- Name: team_requests TeamRequests: own insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "TeamRequests: own insert" ON public.team_requests FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (NOT public.is_banned())));


--
-- Name: team_requests TeamRequests: own or manager delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "TeamRequests: own or manager delete" ON public.team_requests FOR DELETE USING (((auth.uid() = user_id) OR public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_requests.team_id) AND (team_members.user_id = auth.uid()) AND ((team_members.role)::text = ANY ((ARRAY['owner'::character varying, 'officer'::character varying])::text[])))))));


--
-- Name: team_requests TeamRequests: own or manager read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "TeamRequests: own or manager read" ON public.team_requests FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_requests.team_id) AND (team_members.user_id = auth.uid()) AND ((team_members.role)::text = ANY ((ARRAY['owner'::character varying, 'officer'::character varying])::text[])))))));


--
-- Name: teams Teams: read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teams: read" ON public.teams FOR SELECT USING (((COALESCE(is_deleted, false) = false) AND ((is_public = true) OR (EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = teams.id) AND (team_members.user_id = auth.uid())))))));


--
-- Name: friend_requests Update Friend Requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Update Friend Requests" ON public.friend_requests FOR UPDATE USING ((auth.uid() = receiver_id)) WITH CHECK (((auth.uid() = receiver_id) AND (NOT public.is_banned())));


--
-- Name: duels Update own duel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Update own duel" ON public.duels FOR UPDATE USING (((( SELECT auth.uid() AS uid) = player1_id) OR (( SELECT auth.uid() AS uid) = player2_id))) WITH CHECK (((auth.uid() = player1_id) OR (auth.uid() = player2_id)));


--
-- Name: user_bans UserBans: admin read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "UserBans: admin read" ON public.user_bans FOR SELECT USING ((public.has_admin_permission('manage_bans'::text) OR public.has_admin_permission('manage_users'::text)));


--
-- Name: user_daily_challenges UserChallenges: own read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "UserChallenges: own read" ON public.user_daily_challenges FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: volt_token_transactions VoltTokenTx: own read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "VoltTokenTx: own read" ON public.volt_token_transactions FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: volt_tokens VoltTokens: own read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "VoltTokens: own read" ON public.volt_tokens FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: broadcasts Write Broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Write Broadcasts" ON public.broadcasts FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: global_chat Write Chat; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Write Chat" ON public.global_chat FOR INSERT WITH CHECK (((auth.role() = 'authenticated'::text) AND (auth.uid() = uid) AND (NOT public.is_banned()) AND (NOT public.has_active_ban(auth.uid(), 'chat'::text))));


--
-- Name: achievements ach_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ach_public_read ON public.achievements FOR SELECT USING (((auth.uid() IS NOT NULL) AND (active = true) AND ((hidden = false) OR public.is_admin())));


--
-- Name: achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_feed; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_feed activity_feed_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_feed_insert ON public.activity_feed FOR INSERT WITH CHECK ((auth.uid() = actor_id));


--
-- Name: activity_feed activity_feed_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_feed_read ON public.activity_feed FOR SELECT USING (true);


--
-- Name: admin_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings app_settings_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_settings_admin_only ON public.app_settings USING (public.has_admin_permission('view_audit_logs'::text)) WITH CHECK (public.has_admin_permission('view_audit_logs'::text));


--
-- Name: ban_appeals appeal_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY appeal_admin_update ON public.ban_appeals FOR UPDATE USING (public.is_admin());


--
-- Name: ban_appeals appeal_admin_view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY appeal_admin_view ON public.ban_appeals FOR SELECT USING (public.is_admin());


--
-- Name: ban_appeals appeal_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY appeal_insert_own ON public.ban_appeals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ban_appeals appeal_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY appeal_own ON public.ban_appeals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ban_appeals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;

--
-- Name: blacklist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;

--
-- Name: blacklist blacklist_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blacklist_admin_only ON public.blacklist FOR SELECT USING (public.has_admin_permission('view_audit_logs'::text));


--
-- Name: broadcasts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

--
-- Name: category_bounds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.category_bounds ENABLE ROW LEVEL SECURITY;

--
-- Name: category_bounds category_bounds_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY category_bounds_read_all ON public.category_bounds FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: community_challenges cc_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cc_read ON public.community_challenges FOR SELECT USING (true);


--
-- Name: client_error_logs cel_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cel_admin_read ON public.client_error_logs FOR SELECT USING (public.has_admin_permission('view_audit_logs'::text));


--
-- Name: client_error_logs cel_self_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cel_self_insert ON public.client_error_logs FOR INSERT WITH CHECK (((user_id IS NULL) OR (auth.uid() = user_id)));


--
-- Name: client_error_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: community_challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

--
-- Name: cosmetics_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cosmetics_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: cosmetics_catalog cosmetics_catalog_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cosmetics_catalog_public_read ON public.cosmetics_catalog FOR SELECT USING (true);


--
-- Name: credit_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_transfers ct_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ct_select_own ON public.credit_transfers FOR SELECT USING (((auth.uid() = from_user_id) OR (auth.uid() = to_user_id)));


--
-- Name: daily_challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: user_daily_claims daily_claims_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_claims_own ON public.user_daily_claims USING ((auth.uid() = user_id));


--
-- Name: daily_login_streaks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_login_streaks ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_rewards daily_rewards_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_rewards_read ON public.daily_rewards FOR SELECT USING (true);


--
-- Name: direct_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_login_streaks dls_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dls_self ON public.daily_login_streaks FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: duel_replay_events dre_participant_or_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dre_participant_or_admin_read ON public.duel_replay_events FOR SELECT USING ((public.has_admin_permission('view_audit_logs'::text) OR (auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.duel_matches m
  WHERE ((m.id = duel_replay_events.match_id) AND ((m.challenger_uid = auth.uid()) OR (m.opponent_uid = auth.uid())))))));


--
-- Name: duel_replay_events dre_self_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dre_self_insert ON public.duel_replay_events FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: duel_bot_brackets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.duel_bot_brackets ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_bot_brackets duel_bot_brackets_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY duel_bot_brackets_read_all ON public.duel_bot_brackets FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: duel_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.duel_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_match_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.duel_match_results ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.duel_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_random_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.duel_random_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_replay_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.duel_replay_events ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_round_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.duel_round_results ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_run_states; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.duel_run_states ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_token_stakes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.duel_token_stakes ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_token_stakes duel_token_stakes_participant_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY duel_token_stakes_participant_or_admin ON public.duel_token_stakes FOR SELECT TO authenticated USING (((challenger_uid = auth.uid()) OR (opponent_uid = auth.uid()) OR public.is_admin()));


--
-- Name: duels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

--
-- Name: elo_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.elo_history ENABLE ROW LEVEL SECURITY;

--
-- Name: elo_history elo_history_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY elo_history_own_or_admin ON public.elo_history FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: elo_season_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.elo_season_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: elo_season_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.elo_season_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: elo_seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.elo_seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: elo_seasons elo_seasons_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY elo_seasons_public_read ON public.elo_seasons FOR SELECT USING (true);


--
-- Name: elo_season_rewards esr_self_or_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY esr_self_or_admin_read ON public.elo_season_rewards FOR SELECT USING (((auth.uid() = user_id) OR public.has_admin_permission('view_audit_logs'::text)));


--
-- Name: elo_season_snapshots ess_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ess_public_read ON public.elo_season_snapshots FOR SELECT USING (true);


--
-- Name: follows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

--
-- Name: follows follows_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY follows_public_read ON public.follows FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: follows follows_self_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY follows_self_delete ON public.follows FOR DELETE USING ((auth.uid() = follower_id));


--
-- Name: follows follows_self_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY follows_self_insert ON public.follows FOR INSERT WITH CHECK ((auth.uid() = follower_id));


--
-- Name: friend_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: friends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

--
-- Name: global_chat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_chat ENABLE ROW LEVEL SECURITY;

--
-- Name: hwid_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hwid_history ENABLE ROW LEVEL SECURITY;

--
-- Name: hwid_history hwid_history_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hwid_history_admin_read ON public.hwid_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: ignore_list; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ignore_list ENABLE ROW LEVEL SECURITY;

--
-- Name: ignore_list ignore_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ignore_self ON public.ignore_list USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: ip_bans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ip_bans ENABLE ROW LEVEL SECURITY;

--
-- Name: ip_bans ip_bans_owner_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ip_bans_owner_only ON public.ip_bans USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.grade)::text = 'owner'::text)))));


--
-- Name: loot_box_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loot_box_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: loot_box_catalog loot_catalog_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loot_catalog_read ON public.loot_box_catalog FOR SELECT USING ((is_active = true));


--
-- Name: message_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: moderation_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: moderation_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

--
-- Name: moderation_log modlog_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY modlog_admin ON public.moderation_log FOR SELECT USING (public.is_admin());


--
-- Name: monthly_credit_grants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monthly_credit_grants ENABLE ROW LEVEL SECURITY;

--
-- Name: message_reactions mr_auth_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mr_auth_read ON public.message_reactions FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: message_reactions mr_self_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mr_self_write ON public.message_reactions USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: payment_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_orders payment_orders_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_orders_own_or_admin ON public.payment_orders FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: payment_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_webhook_events payment_webhook_events_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_webhook_events_admin_only ON public.payment_webhook_events FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: player_elo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_elo ENABLE ROW LEVEL SECURITY;

--
-- Name: player_elo player_elo_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY player_elo_read_authenticated ON public.player_elo FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: premium_emojis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.premium_emojis ENABLE ROW LEVEL SECURITY;

--
-- Name: premium_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: volt_presence presence_self_friends_opponents_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presence_self_friends_opponents_read ON public.volt_presence FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.friends f
  WHERE ((f.user_id = auth.uid()) AND (f.friend_id = volt_presence.user_id)))) OR (EXISTS ( SELECT 1
   FROM public.duel_matches d
  WHERE (((d.status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying])::text[])) AND (((d.challenger_uid = auth.uid()) AND (d.opponent_uid = volt_presence.user_id)) OR ((d.opponent_uid = auth.uid()) AND (d.challenger_uid = volt_presence.user_id))))))));


--
-- Name: profile_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_views pv_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pv_self_read ON public.profile_views FOR SELECT USING (((auth.uid() = profile_id) OR (auth.uid() = viewer_id) OR public.is_admin()));


--
-- Name: run_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.run_history ENABLE ROW LEVEL SECURITY;

--
-- Name: score_nonces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.score_nonces ENABLE ROW LEVEL SECURITY;

--
-- Name: score_signatures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.score_signatures ENABLE ROW LEVEL SECURITY;

--
-- Name: score_signatures score_signatures_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY score_signatures_owner_select ON public.score_signatures FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

--
-- Name: season_pass_nodes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.season_pass_nodes ENABLE ROW LEVEL SECURITY;

--
-- Name: season_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.season_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: seasons seasons_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seasons_read_all ON public.seasons FOR SELECT USING (true);


--
-- Name: season_snapshots snapshots_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snapshots_own ON public.season_snapshots FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_spin_history spin_history_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spin_history_own ON public.user_spin_history USING ((auth.uid() = user_id));


--
-- Name: spin_wheel_items spin_items_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spin_items_read ON public.spin_wheel_items FOR SELECT USING (true);


--
-- Name: spin_wheel_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.spin_wheel_items ENABLE ROW LEVEL SECURITY;

--
-- Name: season_pass_nodes spn_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spn_read ON public.season_pass_nodes FOR SELECT TO authenticated USING (true);


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_own_or_admin ON public.subscriptions FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: team_achievements ta_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ta_read ON public.team_achievements FOR SELECT USING (true);


--
-- Name: team_achievement_unlocks tau_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tau_read ON public.team_achievement_unlocks FOR SELECT USING (true);


--
-- Name: team_credit_bank tcb_team_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tcb_team_read ON public.team_credit_bank FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_credit_bank.team_id) AND (team_members.user_id = auth.uid())))));


--
-- Name: team_credit_transactions tct_team_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tct_team_read ON public.team_credit_transactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_credit_transactions.team_id) AND (team_members.user_id = auth.uid())))));


--
-- Name: team_daily_challenges tdc_member_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tdc_member_read ON public.team_daily_challenges FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_daily_challenges.team_id) AND (team_members.user_id = auth.uid())))));


--
-- Name: team_achievement_unlocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_achievement_unlocks ENABLE ROW LEVEL SECURITY;

--
-- Name: team_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: team_chat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_chat ENABLE ROW LEVEL SECURITY;

--
-- Name: team_credit_bank; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_credit_bank ENABLE ROW LEVEL SECURITY;

--
-- Name: team_credit_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_credit_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: team_daily_challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_daily_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: team_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members team_members_visibility; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_members_visibility ON public.team_members FOR SELECT USING ((public.has_admin_permission('view_audit_logs'::text) OR (EXISTS ( SELECT 1
   FROM public.teams t
  WHERE ((t.id = team_members.team_id) AND ((COALESCE(t.is_public, true) = true) OR public.is_team_member(t.id, auth.uid())))))));


--
-- Name: team_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: team_wars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_wars ENABLE ROW LEVEL SECURITY;

--
-- Name: team_wars team_wars_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_wars_read ON public.team_wars FOR SELECT USING (true);


--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: titles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;

--
-- Name: titles titles_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY titles_read_all ON public.titles FOR SELECT USING (true);


--
-- Name: tournament_matches tm_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tm_public_read ON public.tournament_matches FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: tournaments tn_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tn_public_read ON public.tournaments FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: tournament_matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: tournaments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_participants tp_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tp_public_read ON public.tournament_participants FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: user_achievements ua_owner_or_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ua_owner_or_public ON public.user_achievements FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: user_blocks ub_self_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ub_self_delete ON public.user_blocks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_blocks ub_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ub_self_read ON public.user_blocks FOR SELECT USING (((auth.uid() = user_id) OR public.has_admin_permission('view_audit_logs'::text)));


--
-- Name: user_blocks ub_self_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ub_self_write ON public.user_blocks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: user_bans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

--
-- Name: user_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_daily_challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_daily_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: user_daily_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_daily_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: user_hmac_secrets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_hmac_secrets ENABLE ROW LEVEL SECURITY;

--
-- Name: user_loot_boxes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_loot_boxes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_loot_boxes user_loot_boxes_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_loot_boxes_own ON public.user_loot_boxes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_lucky_boxes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_lucky_boxes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_lucky_boxes user_lucky_boxes_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_lucky_boxes_self_read ON public.user_lucky_boxes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_season_pass_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_season_pass_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: user_spin_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_spin_history ENABLE ROW LEVEL SECURITY;

--
-- Name: user_titles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_titles user_titles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_titles_select_own ON public.user_titles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: user_season_pass_progress uspp_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY uspp_own ON public.user_season_pass_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: volt_credit_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.volt_credit_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: volt_credits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.volt_credits ENABLE ROW LEVEL SECURITY;

--
-- Name: volt_presence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.volt_presence ENABLE ROW LEVEL SECURITY;

--
-- Name: volt_token_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.volt_token_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: volt_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.volt_tokens ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

