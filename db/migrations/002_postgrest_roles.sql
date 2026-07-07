do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'web_anon') then
    create role web_anon nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'traffic_admin') then
    create role traffic_admin nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login password 'localdev_authenticator_password';
  else
    alter role authenticator with login password 'localdev_authenticator_password';
  end if;
end
$$;

grant web_anon to authenticator;
grant traffic_admin to authenticator;

grant usage on schema api to web_anon, traffic_admin;
grant select on all sequences in schema api to traffic_admin;
