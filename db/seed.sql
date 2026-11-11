-- Idempotent: wipes and refills demo data. Coordinates are made up, around Brétigny-sur-Orge.
truncate pylons restart identity;

insert into pylons (line_code, seq, code, lat, lng, condition, last_inspected_at) values
  ('L-ESS-01', 1, 'ESS01-001', 48.6070, 2.3050, 'ok',            now() - interval '3 days'),
  ('L-ESS-01', 2, 'ESS01-002', 48.6010, 2.3180, 'ok',            now() - interval '3 days'),
  ('L-ESS-01', 3, 'ESS01-003', 48.5955, 2.3310, 'defect',        now() - interval '3 days'),
  ('L-ESS-01', 4, 'ESS01-004', 48.5900, 2.3445, 'ok',            now() - interval '3 days'),
  ('L-ESS-01', 5, 'ESS01-005', 48.5840, 2.3570, 'not_inspected', null),
  ('L-ESS-01', 6, 'ESS01-006', 48.5785, 2.3700, 'not_inspected', null),
  ('L-ESS-02', 1, 'ESS02-001', 48.6250, 2.2800, 'ok',            now() - interval '10 days'),
  ('L-ESS-02', 2, 'ESS02-002', 48.6180, 2.2900, 'defect',        now() - interval '10 days'),
  ('L-ESS-02', 3, 'ESS02-003', 48.6110, 2.2985, 'ok',            now() - interval '10 days'),
  ('L-ESS-02', 4, 'ESS02-004', 48.6070, 2.3050, 'not_inspected', null);
