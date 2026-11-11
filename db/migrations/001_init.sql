-- One row per pylon. A power line is the ordered list of its pylons (by seq),
-- so the line geometry is derived, never stored twice.
create table pylons (
  id                serial primary key,
  line_code         text not null,
  seq               int  not null check (seq > 0),
  code              text not null unique,
  lat               double precision not null check (lat between -90 and 90),
  lng               double precision not null check (lng between -180 and 180),
  condition         text not null default 'not_inspected'
                    check (condition in ('ok', 'defect', 'not_inspected')),
  last_inspected_at timestamptz,
  unique (line_code, seq)
);

create index pylons_condition_idx on pylons (condition);
