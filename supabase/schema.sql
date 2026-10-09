-- Pegar entero en Supabase > SQL Editor > Run.
create table if not exists datos (
  clave text primary key,            -- 'tren' | 'luz' | 'clima'
  contenido jsonb,                   -- último dato bueno
  ok_en timestamptz,                 -- cuándo se leyó bien por última vez
  intento_en timestamptz,            -- último intento (bueno o malo)
  error text                         -- motivo del último intento fallido
);
create table if not exists reportes (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  seccion text not null,
  mensaje text not null default ''
);
create table if not exists visitas (
  dia date not null,
  visitante text not null,           -- número al azar guardado en el celu; no identifica a nadie
  primary key (dia, visitante)
);

alter table datos enable row level security;
alter table reportes enable row level security;
alter table visitas enable row level security;
-- La pantalla (clave pública) solo puede LEER datos. Todo lo demás pasa por el servidor.
drop policy if exists "leer datos" on datos;
create policy "leer datos" on datos for select to anon using (true);

create or replace view panel_dias as
select v.dia, count(*) as visitantes, count(*) filter (where p.primer_dia < v.dia) as volvieron
from visitas v join (select visitante, min(dia) as primer_dia from visitas group by 1) p using (visitante)
group by v.dia order by v.dia desc limit 30;

create or replace view panel_resumen as
select count(*) as visitantes_totales, count(*) filter (where dias > 1) as volvieron_otro_dia
from (select visitante, count(distinct dia) as dias from visitas group by 1) t;

revoke all on panel_dias, panel_resumen, reportes, visitas from anon, authenticated;
