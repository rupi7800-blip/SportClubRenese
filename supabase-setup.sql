-- =====================================================================
-- Sport Club Renese · configurazione del database su Supabase
-- Incolla tutto nel SQL Editor del progetto Supabase e premi "Run".
-- Si può rieseguire senza danni (non cancella i dati).
--
-- Ruoli:
--   senior  = amministratore senior: decide chi sono gli amministratori
--             junior e dà tutti i permessi (sezioni, atleta/sostenitore)
--   junior  = amministratore junior: gestisce solo le sezioni che il
--             senior gli ha affidato (iscrizioni, allenamenti, gare, eventi)
--   socio   = utente: atleta o sostenitore; partecipa alle sezioni
--             per cui il senior gli ha dato il permesso
-- Il PRIMO account registrato diventa automaticamente amministratore senior.
-- =====================================================================

-- 1. Profili dei soci -----------------------------------------------------
create table if not exists public.profili (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  nome             text not null default '' check (char_length(nome) <= 60),
  cognome          text not null default '' check (char_length(cognome) <= 60),
  telefono         text check (telefono is null or char_length(telefono) <= 30),
  data_nascita     date,
  tessera          text check (tessera is null or char_length(tessera) <= 30),
  tipo             text not null default 'sostenitore' check (tipo in ('atleta','sostenitore')),
  ruolo            text not null default 'socio' check (ruolo in ('senior','junior','socio')),
  stato            text not null default 'in_attesa' check (stato in ('in_attesa','attivo','sospeso')),
  scadenza         date,
  -- permessi di partecipazione (segnare presenze / disponibilità)
  perm_allenamenti boolean not null default false,
  perm_gare        boolean not null default false,
  perm_eventi      boolean not null default false,
  -- sezioni affidate a un amministratore junior
  gest_iscrizioni  boolean not null default false,
  gest_allenamenti boolean not null default false,
  gest_gare        boolean not null default false,
  gest_eventi      boolean not null default false,
  creato           timestamptz not null default now()
);

-- 2. Funzioni di controllo dei permessi ------------------------------------
create or replace function public.e_senior() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profili where id = auth.uid() and ruolo = 'senior' and stato = 'attivo');
$$;

create or replace function public.e_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profili where id = auth.uid() and ruolo in ('senior','junior') and stato = 'attivo');
$$;

create or replace function public.e_attivo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profili where id = auth.uid() and stato = 'attivo');
$$;

-- sezione: 'iscrizioni' | 'allenamenti' | 'gare' | 'eventi'
create or replace function public.puo_gestire(sezione text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profili p
    where p.id = auth.uid() and p.stato = 'attivo'
      and (p.ruolo = 'senior' or (p.ruolo = 'junior' and case sezione
            when 'iscrizioni'  then p.gest_iscrizioni
            when 'allenamenti' then p.gest_allenamenti
            when 'gare'        then p.gest_gare
            when 'eventi'      then p.gest_eventi
            else false end))
  );
$$;

create or replace function public.puo_partecipare(sezione text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.puo_gestire(sezione) or exists (
    select 1 from profili p
    where p.id = auth.uid() and p.stato = 'attivo'
      and case sezione
            when 'allenamenti' then p.perm_allenamenti
            when 'gare'        then p.perm_gare
            when 'eventi'      then p.perm_eventi
            else false end
  );
$$;

create or replace function public.sezione_di(tipo_attivita text) returns text
language sql immutable as $$
  select case tipo_attivita when 'allenamento' then 'allenamenti' when 'gara' then 'gare' when 'evento' then 'eventi' end;
$$;

-- 3. Nuovo account → profilo (il primo diventa senior) -----------------------
create or replace function public.nuovo_profilo() returns trigger
language plpgsql security definer set search_path = public as $$
declare primo boolean;
begin
  select not exists (select 1 from profili) into primo;
  insert into profili (id, email, nome, cognome, ruolo, stato, tipo,
                       perm_allenamenti, perm_gare, perm_eventi)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'nome', ''),
          coalesce(new.raw_user_meta_data->>'cognome', ''),
          case when primo then 'senior' else 'socio' end,
          case when primo then 'attivo' else 'in_attesa' end,
          case when (new.raw_user_meta_data->>'tipo') = 'atleta' then 'atleta' else 'sostenitore' end,
          primo, primo, primo)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists su_nuovo_utente on auth.users;
create trigger su_nuovo_utente after insert on auth.users
  for each row execute function public.nuovo_profilo();

-- 4. Protezione dei campi riservati ------------------------------------------
create or replace function public.proteggi_profilo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;          -- SQL Editor / servizio
  if new.id <> old.id or new.email is distinct from old.email then
    raise exception 'Campo non modificabile';
  end if;
  if not e_senior() then
    if new.ruolo <> old.ruolo or new.tipo <> old.tipo
       or new.perm_allenamenti <> old.perm_allenamenti or new.perm_gare <> old.perm_gare or new.perm_eventi <> old.perm_eventi
       or new.gest_iscrizioni <> old.gest_iscrizioni or new.gest_allenamenti <> old.gest_allenamenti
       or new.gest_gare <> old.gest_gare or new.gest_eventi <> old.gest_eventi then
      raise exception 'Solo l''amministratore senior può cambiare ruoli e permessi';
    end if;
    if (new.stato <> old.stato or new.scadenza is distinct from old.scadenza) and not puo_gestire('iscrizioni') then
      raise exception 'Non hai il permesso di gestire le iscrizioni';
    end if;
    if new.id <> auth.uid() and not puo_gestire('iscrizioni')
       and (new.nome, new.cognome, new.telefono, new.data_nascita, new.tessera)
           is distinct from (old.nome, old.cognome, old.telefono, old.data_nascita, old.tessera) then
      raise exception 'Non puoi modificare i dati di un altro socio';
    end if;
  end if;
  -- non lasciare il club senza amministratore senior
  if old.ruolo = 'senior' and (new.ruolo <> 'senior' or new.stato <> 'attivo')
     and not exists (select 1 from profili where ruolo = 'senior' and stato = 'attivo' and id <> old.id) then
    raise exception 'Serve almeno un amministratore senior: nomina prima un altro senior';
  end if;
  return new;
end $$;

drop trigger if exists proteggi_profilo on public.profili;
create trigger proteggi_profilo before update on public.profili
  for each row execute function public.proteggi_profilo();

alter table public.profili enable row level security;
drop policy if exists "profili leggi" on public.profili;
drop policy if exists "profili modifica" on public.profili;
drop policy if exists "profili elimina" on public.profili;
create policy "profili leggi" on public.profili for select to authenticated
  using (id = auth.uid() or e_attivo());
create policy "profili modifica" on public.profili for update to authenticated
  using (id = auth.uid() or e_admin()) with check (id = auth.uid() or e_admin());
create policy "profili elimina" on public.profili for delete to authenticated
  using (e_senior() and id <> auth.uid());

-- 5. Attività: allenamenti, gare, eventi --------------------------------------
create table if not exists public.attivita (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('allenamento','gara','evento')),
  ambiente    text check (ambiente in ('indoor','outdoor')),          -- solo allenamenti
  titolo      text not null check (char_length(titolo) between 1 and 120),
  inizio      timestamptz not null,
  fine        timestamptz,
  luogo       text check (luogo is null or char_length(luogo) <= 160),
  programma   text check (programma is null or char_length(programma) <= 4000),
  descrizione text check (descrizione is null or char_length(descrizione) <= 2000),
  specialita  text check (specialita is null or char_length(specialita) <= 60),  -- Jole, Elba, Gozzo, VIP…
  posti       integer check (posti is null or posti > 0),
  chiusura    timestamptz,                                           -- chiusura iscrizioni
  link        text check (link is null or char_length(link) <= 500),
  serie       uuid,                                                  -- allenamenti ripetuti
  creato_da   uuid default auth.uid() references public.profili(id) on delete set null,
  creato      timestamptz not null default now(),
  check (tipo <> 'allenamento' or ambiente is not null)
);
create index if not exists attivita_inizio_idx on public.attivita (inizio);

alter table public.attivita enable row level security;
drop policy if exists "attivita leggi" on public.attivita;
drop policy if exists "attivita crea" on public.attivita;
drop policy if exists "attivita modifica" on public.attivita;
drop policy if exists "attivita elimina" on public.attivita;
create policy "attivita leggi" on public.attivita for select to authenticated using (e_attivo());
create policy "attivita crea" on public.attivita for insert to authenticated with check (puo_gestire(sezione_di(tipo)));
create policy "attivita modifica" on public.attivita for update to authenticated
  using (puo_gestire(sezione_di(tipo))) with check (puo_gestire(sezione_di(tipo)));
create policy "attivita elimina" on public.attivita for delete to authenticated using (puo_gestire(sezione_di(tipo)));

-- 6. Partecipazioni e presenze ------------------------------------------------
create table if not exists public.partecipazioni (
  attivita_id uuid not null references public.attivita(id) on delete cascade,
  user_id     uuid not null references public.profili(id) on delete cascade,
  risposta    text not null default 'si' check (risposta in ('si','forse','no')),
  presente    boolean,                       -- confermato dagli amministratori
  nota        text check (nota is null or char_length(nota) <= 300),
  aggiornato  timestamptz not null default now(),
  primary key (attivita_id, user_id)
);

create or replace function public.controlla_partecipazione() returns trigger
language plpgsql security definer set search_path = public as $$
declare a attivita; occupati int; gestore boolean;
begin
  select * into a from attivita where id = new.attivita_id;
  gestore := puo_gestire(sezione_di(a.tipo));
  if auth.uid() is null or gestore then new.aggiornato := now(); return new; end if;
  if tg_op = 'UPDATE' and new.presente is distinct from old.presente then
    raise exception 'La presenza viene confermata dagli amministratori';
  end if;
  if tg_op = 'INSERT' then new.presente := null; end if;
  if a.chiusura is not null and now() > a.chiusura then
    raise exception 'Iscrizioni chiuse';
  end if;
  if a.posti is not null and new.risposta = 'si' and (tg_op = 'INSERT' or old.risposta <> 'si') then
    select count(*) into occupati from partecipazioni where attivita_id = a.id and risposta = 'si';
    if occupati >= a.posti then raise exception 'Posti esauriti'; end if;
  end if;
  new.aggiornato := now();
  return new;
end $$;

drop trigger if exists controlla_partecipazione on public.partecipazioni;
create trigger controlla_partecipazione before insert or update on public.partecipazioni
  for each row execute function public.controlla_partecipazione();

alter table public.partecipazioni enable row level security;
drop policy if exists "part leggi" on public.partecipazioni;
drop policy if exists "part crea" on public.partecipazioni;
drop policy if exists "part modifica" on public.partecipazioni;
drop policy if exists "part elimina" on public.partecipazioni;
create policy "part leggi" on public.partecipazioni for select to authenticated using (e_attivo());
create policy "part crea" on public.partecipazioni for insert to authenticated with check (
  exists (select 1 from attivita a where a.id = attivita_id and (
    puo_gestire(sezione_di(a.tipo)) or (user_id = auth.uid() and puo_partecipare(sezione_di(a.tipo))))));
create policy "part modifica" on public.partecipazioni for update to authenticated using (
  exists (select 1 from attivita a where a.id = attivita_id and (
    puo_gestire(sezione_di(a.tipo)) or (user_id = auth.uid() and puo_partecipare(sezione_di(a.tipo))))));
create policy "part elimina" on public.partecipazioni for delete to authenticated using (
  exists (select 1 from attivita a where a.id = attivita_id and (
    puo_gestire(sezione_di(a.tipo)) or user_id = auth.uid())));

-- 7. Scheda atleta: resoconti degli allenamenti --------------------------------
create table if not exists public.resoconti (
  id          uuid primary key default gen_random_uuid(),
  atleta_id   uuid not null references public.profili(id) on delete cascade,
  attivita_id uuid references public.attivita(id) on delete set null,
  data        date not null default current_date,
  ambiente    text check (ambiente in ('indoor','outdoor')),
  lavoro      text not null check (char_length(lavoro) between 1 and 160),   -- es. "6×500 m remoergometro"
  distanza_m  integer check (distanza_m is null or distanza_m >= 0),
  durata      text check (durata is null or char_length(durata) <= 20),      -- es. "45:00"
  passo_500   text check (passo_500 is null or char_length(passo_500) <= 20),-- es. "1:52.4"
  colpi_min   integer check (colpi_min is null or colpi_min between 0 and 80),
  fc_media    integer check (fc_media is null or fc_media between 30 and 230),
  rpe         integer check (rpe is null or rpe between 1 and 10),
  risultato   text check (risultato is null or char_length(risultato) <= 300),
  note        text check (note is null or char_length(note) <= 1000),
  autore_id   uuid default auth.uid() references public.profili(id) on delete set null,
  creato      timestamptz not null default now()
);
create index if not exists resoconti_atleta_idx on public.resoconti (atleta_id, data desc);

alter table public.resoconti enable row level security;
drop policy if exists "reso leggi" on public.resoconti;
drop policy if exists "reso crea" on public.resoconti;
drop policy if exists "reso modifica" on public.resoconti;
drop policy if exists "reso elimina" on public.resoconti;
create policy "reso leggi" on public.resoconti for select to authenticated
  using (atleta_id = auth.uid() or e_admin());
create policy "reso crea" on public.resoconti for insert to authenticated with check (
  puo_gestire('allenamenti') or (atleta_id = auth.uid() and e_attivo()
    and exists (select 1 from profili where id = auth.uid() and tipo = 'atleta')));
create policy "reso modifica" on public.resoconti for update to authenticated
  using (puo_gestire('allenamenti') or atleta_id = auth.uid())
  with check (puo_gestire('allenamenti') or atleta_id = auth.uid());
create policy "reso elimina" on public.resoconti for delete to authenticated
  using (puo_gestire('allenamenti') or atleta_id = auth.uid());

-- 8. Risultati di gara (scheda atleta + classifica interna) ---------------------
create table if not exists public.risultati (
  id          uuid primary key default gen_random_uuid(),
  atleta_id   uuid not null references public.profili(id) on delete cascade,
  attivita_id uuid references public.attivita(id) on delete set null,
  data        date not null default current_date,
  gara        text not null check (char_length(gara) between 1 and 120),
  specialita  text check (specialita is null or char_length(specialita) <= 60),
  barca       text check (barca is null or char_length(barca) <= 40),
  categoria   text check (categoria is null or char_length(categoria) <= 40),
  posizione   integer check (posizione is null or posizione between 1 and 99),
  tempo       text check (tempo is null or char_length(tempo) <= 20),
  note        text check (note is null or char_length(note) <= 300),
  autore_id   uuid default auth.uid() references public.profili(id) on delete set null,
  creato      timestamptz not null default now()
);
create index if not exists risultati_atleta_idx on public.risultati (atleta_id, data desc);

alter table public.risultati enable row level security;
drop policy if exists "ris leggi" on public.risultati;
drop policy if exists "ris crea" on public.risultati;
drop policy if exists "ris modifica" on public.risultati;
drop policy if exists "ris elimina" on public.risultati;
create policy "ris leggi" on public.risultati for select to authenticated using (e_attivo());
create policy "ris crea" on public.risultati for insert to authenticated with check (
  puo_gestire('gare') or (atleta_id = auth.uid() and e_attivo()
    and exists (select 1 from profili where id = auth.uid() and tipo = 'atleta')));
create policy "ris modifica" on public.risultati for update to authenticated
  using (puo_gestire('gare') or atleta_id = auth.uid())
  with check (puo_gestire('gare') or atleta_id = auth.uid());
create policy "ris elimina" on public.risultati for delete to authenticated
  using (puo_gestire('gare') or atleta_id = auth.uid());

-- 9. Permessi di base per gli utenti collegati -----------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profili, public.attivita, public.partecipazioni,
  public.resoconti, public.risultati to authenticated;
grant execute on function public.e_senior(), public.e_admin(), public.e_attivo(),
  public.puo_gestire(text), public.puo_partecipare(text), public.sezione_di(text) to authenticated;
