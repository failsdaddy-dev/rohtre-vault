# Admin guide

## Add a card
1. **Admin → Cards → New card.**
2. Title (the link name fills itself in; you can edit it), section, description.
3. **Preview:** paste the unlisted YouTube link, set start and end seconds
   (3–8 seconds works best), press **Test preview**.
4. **Tutorial:** paste the Loom share link. Leave it empty if it isn't
   recorded yet; the Tutorial button then shows greyed out.
5. **Project files:** one Mega link per software, each with a label
   (Premiere Pro, After Effects…). **Downloads:** the ready file itself
   (transparent .mov, .mp4, audio, font).
6. Music only: **Open on platform** link (e.g. Epidemic Sound).
7. Tick 3–4 **filters** on the right, choose **Published**, save.

Share it: open the card and press **Copy link**, or copy a filtered section
link such as `/effects?f=cartoon,fc-27`. A filtered link only ever shows
cards inside those filters.

Quick tagging: in **Cards**, right-click any row to tick filters in place.

## Filters
- Same group = any of them (FC 27 **or** FC 20). Different groups = all of
  them (FC 27 **and** Cartoon).
- **Chip** switch: shows the filter in the chip row under the search bar.
- **Merge** moves every card and every editor's access to the other filter,
  then deletes the old one.
- A group can be deleted only when it has no filters.

## Users
- **Add user:** email, name, password (Generate), and either
  **All access** or the filters they may see. **Never expires** is on by
  default; switch it off to pick the last day the account works.
  Share the login privately. Editors keep this password; only the admin
  can change it.
- **Disable:** locks them out immediately. **Delete:** removes the login.
- **Reset password:** sets a new password; the old one stops working.

## Audit log
Sign-ins, every link open (with the card and label), refused opens and admin
changes. The Cards list shows how often each card's links were opened.

## Two-factor sign-in (Admin → 2FA)
- **Switch on:** scan the QR code with an authenticator app and enter the
  6-digit code. From then on every admin sign-in asks for a code, and admin
  tools stay locked until it's entered.
- **Get a new QR code:** for a new phone. Scan the new code and confirm it;
  only then does the old one stop working.
- **Switch off:** asks you to confirm. Admin then needs only the password.
  Keep it on unless you have a reason.
- Lost your phone? In the Supabase SQL editor run
  `delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'you@example.com');`
  then set 2FA up again.
