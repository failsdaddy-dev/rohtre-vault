# Admin guide

## Add a card
1. **Admin → Cards → New card.**
2. Title (the link name fills itself in; you can edit it), section, description.
3. **Video cards:**
   under *Preview clip* click **Choose video**
   and pick the effect file itself (any size, MP4 or MOV). Drag **Start at**
   to the best moment, choose 6, 8 or 10 s, press **Make preview** (about a
   minute; the first time also loads a 32 MB video tool), check it, then
   **Use this preview**. Only the small preview (under 2 MB) is uploaded; it
   loops silently on the card with no player buttons; clicking the card
   shows it bigger with the card's buttons.
   **Music cards:** under **Media** choose **Audio (MP3)**, then **Choose
   track** and pick the full song (any size: MP3, WAV, M4A, FLAC). Drag the
   red 30-second window over the waveform (or use **Start at**), press
   **Listen to this part**, then **Make preview** (a few seconds) and **Use
   this preview**. Only the 30-second MP3 (about 0.5 MB) is uploaded. **Test
   play** plays it in the site's player. Put the full track under **Downloads** (Mega). **Replace file** or
   **✕** swaps or removes a preview; the old file leaves Cloudinary when you
   save. Setup once: docs/cloudinary-setup.md.
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

## Sign-in
Email and password only (2FA was removed on 2026-10-12). Use a strong admin
password and don't share it: anyone with it can open the admin tools.
