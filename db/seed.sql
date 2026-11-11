-- Demo account for local testing: demo@hylight.test / hylight-demo
-- Idempotent: running the seed again keeps existing users and photos.
insert into users (email, password_hash) values (
  'demo@hylight.test',
  'scrypt$055c5863272eca852198d1482701b9d9$4389b6dad46e417135c207abd234eda845ca4b10e8f2f02b710e2ade4ec96fe4a9eab66100c6ed24383272e5b3e5e22877e3ad4ef270a04c23f8909524af355f'
) on conflict (email) do nothing;
