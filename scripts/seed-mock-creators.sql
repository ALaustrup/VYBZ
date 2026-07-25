-- Seed realistic mock creators for VYBZ (idempotent on email).
-- Password for all mocks: VybzDemo2026!
-- Does not touch Andrew / existing non-mock accounts.

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  demo_password text := 'VybzDemo2026!';
  u record;
  asset_id uuid;
  drop_id uuid;
  i int := 0;
begin
  -- Remove prior mock cohort (cascade profiles + content)
  delete from auth.users
  where email like '%@vybz.demo';

  create temporary table mock_creators (
    id uuid primary key,
    email text not null,
    username text not null,
    display_name text not null,
    bio text not null,
    location text not null,
    music_url text,
    avatar_seed text not null,
    genres text[] not null,
    daws text[] not null,
    offer_roles text[] not null,
    seek_roles text[] not null,
    open_to_work boolean not null default true,
    drop_title text not null,
    drop_body text,
    bpm numeric,
    musical_key text,
    song_n int not null
  ) on commit drop;

  insert into mock_creators values
  (
    'a1000001-0000-4000-8000-000000000001',
    'maya.chen@vybz.demo', 'mayachen', 'Maya Chen',
    'LA beatmaker. Dusty chops, hard 808s, and late-night session energy. Looking for rappers who write.',
    'Los Angeles, CA', 'https://soundcloud.com',
    'MayaChen',
    array['hip_hop','trap','lofi'], array['ableton'],
    array['beatmaker','producer','sampler'], array['rapper','topliner','mix_engineer'],
    true, 'Night Bus 808', 'Sketch for a feature verse — open to flips.',
    140, 'F#m', 1
  ),
  (
    'a1000001-0000-4000-8000-000000000002',
    'jordan.reed@vybz.demo', 'jordanreed', 'Jordan Reed',
    'Atlanta writer / rapper. Melodic pockets + pocket bars. Send beats that leave space.',
    'Atlanta, GA', null,
    'JordanReed',
    array['hip_hop','trap','rnb'], array['fl_studio'],
    array['rapper','songwriter_lyricist','topliner'], array['beatmaker','mix_engineer','producer'],
    true, 'Glass Elevator (demo)', 'Reference vocal — need a fuller beat under this.',
    92, 'Cm', 2
  ),
  (
    'a1000001-0000-4000-8000-000000000003',
    'sofia.alvarez@vybz.demo', 'sofiaalvarez', 'Sofía Álvarez',
    'Miami vocalist bridging reggaeton, Latin pop, and alt-R&B. Studio-ready toplines.',
    'Miami, FL', null,
    'SofiaAlvarez',
    array['reggaeton','latin','rnb'], array['logic'],
    array['vocals_lead','topliner','songwriter_lyricist'], array['producer','mix_engineer','arranger'],
    true, 'Calle Luna (hook)', 'Hook idea in Spanglish — producer wanted.',
    96, 'Gm', 3
  ),
  (
    'a1000001-0000-4000-8000-000000000004',
    'nate.okonkwo@vybz.demo', 'nateoko', 'Nate Okonkwo',
    'London Afrobeats / amapiano producer. Log drums, warm pads, dancefloor clarity.',
    'London, UK', null,
    'NateOkonkwo',
    array['afrobeats','amapiano','house'], array['ableton','fl_studio'],
    array['producer','beatmaker','arranger'], array['vocals_lead','topliner','mix_engineer'],
    true, 'Peckham Sunset', 'Instrumental — need a vocalist who can ride the groove.',
    112, 'Am', 4
  ),
  (
    'a1000001-0000-4000-8000-000000000005',
    'ellie.park@vybz.demo', 'elliepark', 'Ellie Park',
    'Bedroom-pop + lo-fi songwriter between Seoul and Brooklyn. Soft vocals, sharp lyrics.',
    'Brooklyn, NY', null,
    'ElliePark',
    array['lofi','indie','pop'], array['logic','ableton'],
    array['songwriter_lyricist','vocals_lead','producer'], array['mix_engineer','guitar_electric','keys_synth'],
    true, 'Fluorescent Laundry', 'Demo from my closet booth. Gentle mix help welcome.',
    78, 'D', 5
  ),
  (
    'a1000001-0000-4000-8000-000000000006',
    'marcus.vale@vybz.demo', 'marcusvale', 'Marcus Vale',
    'Berlin techno / sound design. Modular textures, warehouse pressure, precise arrangement.',
    'Berlin, DE', null,
    'MarcusVale',
    array['techno','house','experimental'], array['ableton','bitwig'],
    array['producer','sound_designer','remixer'], array['mix_engineer','master_engineer','dj_turntables'],
    true, 'Spree at 04:12', 'Peak-time tool. Looking for a remix swap.',
    132, 'Em', 6
  ),
  (
    'a1000001-0000-4000-8000-000000000007',
    'aisha.bennett@vybz.demo', 'aishab', 'Aisha Bennett',
    'NYC R&B songwriter. Harmony stacks, diary-entry verses, session vocals on request.',
    'New York, NY', null,
    'AishaBennett',
    array['rnb','neo_soul','soul'], array['logic'],
    array['songwriter_lyricist','vocals_lead','vocals_backing'], array['producer','keys_synth','mix_engineer'],
    true, 'Velvet Tuesday', 'Topline + BGVs sketched. Need keys/production.',
    74, 'Bb', 7
  ),
  (
    'a1000001-0000-4000-8000-000000000008',
    'diego.santos@vybz.demo', 'diegosantos', 'Diego Santos',
    'São Paulo house DJ/producer. Percussion-forward grooves and festival-ready drops.',
    'São Paulo, BR', null,
    'DiegoSantos',
    array['house','edm','latin'], array['ableton'],
    array['producer','dj_turntables','remixer'], array['vocals_lead','mix_engineer','master_engineer'],
    true, 'Vila Madalena Edit', 'Club edit — open to vocal features.',
    124, 'Fm', 8
  ),
  (
    'a1000001-0000-4000-8000-000000000009',
    'kai.moreno@vybz.demo', 'kaimoreno', 'Kai Moreno',
    'Mix engineer. Clarity without killing the vibe. Hip-hop, alt, and electronic welcome.',
    'Los Angeles, CA', null,
    'KaiMoreno',
    array['hip_hop','indie','edm'], array['pro_tools','ableton'],
    array['mix_engineer','recording_engineer','master_engineer'], array['producer','beatmaker','vocals_lead'],
    true, 'Before / After — Drum Bus', 'Mute-group demo of my drum bus approach.',
    100, 'C', 9
  ),
  (
    'a1000001-0000-4000-8000-00000000000a',
    'riley.frost@vybz.demo', 'rileyfrost', 'Riley Frost',
    'Nashville indie songwriter / guitar. Road stories, open tunings, live-band instincts.',
    'Nashville, TN', null,
    'RileyFrost',
    array['indie','folk','rock'], array['logic','garageband'],
    array['songwriter_lyricist','guitar_acoustic','guitar_electric','vocals_lead'], array['producer','drums','bass'],
    true, 'County Line (acoustic)', 'Looking for a rhythm section for the full-band version.',
    108, 'G', 10
  ),
  (
    'a1000001-0000-4000-8000-00000000000b',
    'yuki.tanaka@vybz.demo', 'yukitanaka', 'Yuki Tanaka',
    'Tokyo ambient / experimental. Field recordings, soft noise, and cinematic pacing.',
    'Tokyo, JP', null,
    'YukiTanaka',
    array['ambient','experimental','classical'], array['ableton','reaper'],
    array['composer','sound_designer','producer'], array['violin','cello','mix_engineer'],
    true, 'Shibuya After Rain', 'Cue for a short film — seeking string players.',
    70, 'Dm', 11
  ),
  (
    'a1000001-0000-4000-8000-00000000000c',
    'cam.holloway@vybz.demo', 'camholloway', 'Cam Holloway',
    'Chicago keys / neo-soul. Rhodes, organ, and improvisation that serves the song.',
    'Chicago, IL', null,
    'CamHolloway',
    array['neo_soul','jazz','funk'], array['logic','ableton'],
    array['keys_synth','piano','arranger'], array['vocals_lead','producer','drums'],
    true, 'Green Line Rhodes', 'Loop for a singer — take it somewhere.',
    86, 'Ebm', 12
  ),
  (
    'a1000001-0000-4000-8000-00000000000d',
    'priya.sharma@vybz.demo', 'priyasharma', 'Priya Sharma',
    'Pop topliner between Mumbai and Toronto. Hooks first, emotion always.',
    'Toronto, CA', null,
    'PriyaSharma',
    array['pop','rnb','dancehall'], array['logic','fl_studio'],
    array['topliner','vocals_lead','songwriter_lyricist'], array['producer','beatmaker','mix_engineer'],
    true, 'Postcard Chorus', 'A cappella chorus — build the world under it.',
    118, 'A', 13
  ),
  (
    'a1000001-0000-4000-8000-00000000000e',
    'devon.blake@vybz.demo', 'devonblake', 'Devon Blake',
    'Portland metal / alt guitar. Tight riffs, weird tunings, and collaborative writing.',
    'Portland, OR', null,
    'DevonBlake',
    array['metal','rock','punk'], array['reaper','cubase'],
    array['guitar_electric','songwriter_lyricist','producer'], array['drums','bass','mix_engineer','vocals_lead'],
    true, 'Rust Belt Riff', 'Riff bed — need drums + a scream/clean vocalist.',
    160, 'Drop D', 14
  );

  for u in select * from mock_creators loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      is_super_admin, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000',
      u.id,
      'authenticated',
      'authenticated',
      u.email,
      extensions.crypt(demo_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', u.username, 'display_name', u.display_name),
      now() - (u.song_n || ' days')::interval,
      now(),
      '', '', '', '',
      false, false, false
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      u.id,
      jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      u.id::text,
      now(),
      now(),
      now()
    );

    update public.profiles set
      username = u.username,
      display_name = u.display_name,
      bio = u.bio,
      location = u.location,
      music_url = u.music_url,
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || u.avatar_seed,
      identity_public = true,
      is_admin = false,
      platform_role = 'member',
      banned = false,
      last_active_at = now() - ((u.song_n % 5) || ' hours')::interval,
      profile = jsonb_build_object(
        'roleClass', 'creator',
        'roleLabel', 'Music',
        'profession', 'music',
        'professions', jsonb_build_array('music'),
        'genres', to_jsonb(u.genres),
        'daws', to_jsonb(u.daws),
        'openToWork', u.open_to_work,
        'remoteOk', true,
        'intents', jsonb_build_array('Find collaborators', 'Showcase work'),
        'languages', jsonb_build_array('en')
      )
    where id = u.id;

    -- Offers
    insert into public.creator_roles (user_id, role_id, skill)
    select u.id, r, 3 + (u.song_n % 3)
    from unnest(u.offer_roles) as r
    where exists (select 1 from public.roles where id = r)
    on conflict do nothing;

    -- Seeks
    insert into public.creator_seeks (user_id, role_id, priority)
    select u.id, r, 1 + (u.song_n % 3)
    from unnest(u.seek_roles) as r
    where exists (select 1 from public.roles where id = r)
    on conflict do nothing;

    asset_id := gen_random_uuid();
    insert into public.assets (
      id, owner_id, kind, title, description, url,
      bpm, musical_key, genres, daw, format, duration_sec,
      downloadable, license
    ) values (
      asset_id,
      u.id,
      'track',
      u.drop_title,
      u.drop_body,
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-' || u.song_n || '.mp3',
      u.bpm,
      u.musical_key,
      u.genres,
      u.daws[1],
      'MP3',
      180 + u.song_n,
      true,
      'credit-required'
    );

    drop_id := gen_random_uuid();
    insert into public.drops (id, author_id, title, body, asset_id, seed, feels, wilds, created_at)
    values (
      drop_id,
      u.id,
      u.drop_title,
      u.drop_body,
      asset_id,
      1000 + u.song_n,
      (u.song_n % 4),
      (u.song_n % 2),
      now() - (u.song_n || ' hours')::interval
    );

    i := i + 1;
  end loop;

  -- A few mutual connections for a lived-in network
  insert into public.connections (requester_id, addressee_id, status, created_at)
  values
    ('a1000001-0000-4000-8000-000000000001', 'a1000001-0000-4000-8000-000000000002', 'accepted', now() - interval '3 days'),
    ('a1000001-0000-4000-8000-000000000003', 'a1000001-0000-4000-8000-000000000004', 'accepted', now() - interval '2 days'),
    ('a1000001-0000-4000-8000-000000000005', 'a1000001-0000-4000-8000-000000000007', 'accepted', now() - interval '1 day'),
    ('a1000001-0000-4000-8000-000000000008', 'a1000001-0000-4000-8000-000000000006', 'accepted', now() - interval '5 days'),
    ('a1000001-0000-4000-8000-000000000009', 'a1000001-0000-4000-8000-000000000001', 'accepted', now() - interval '4 days'),
    ('a1000001-0000-4000-8000-00000000000d', 'a1000001-0000-4000-8000-000000000002', 'pending', now() - interval '6 hours')
  on conflict do nothing;

  raise notice 'Seeded % mock creators', i;
end $$;
