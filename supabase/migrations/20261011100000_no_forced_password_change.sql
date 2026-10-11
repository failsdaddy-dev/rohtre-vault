-- Editors keep the password the admin gives them; nobody is forced to pick a
-- new one at first sign-in. The column stays so older Edge Function versions
-- keep working, but nothing reads it any more.
alter table public.profiles alter column must_change_password set default false;
update public.profiles set must_change_password = false where must_change_password;
