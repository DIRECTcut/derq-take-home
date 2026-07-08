do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    revoke web_anon from authenticator;
    revoke traffic_admin from authenticator;
  end if;

  if exists (select 1 from pg_roles where rolname = 'web_anon') then
    revoke usage on schema api from web_anon;
    revoke all privileges on all tables in schema api from web_anon;
    revoke all privileges on all sequences in schema api from web_anon;
    drop role web_anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'traffic_admin') then
    revoke usage on schema api from traffic_admin;
    revoke all privileges on all tables in schema api from traffic_admin;
    revoke all privileges on all sequences in schema api from traffic_admin;
    drop role traffic_admin;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    drop role authenticator;
  end if;
end
$$;
