# 📌 Resuming Nish-Logic Portal

Everything is configured for automated quiz generation and hybrid deployment.

## 🟢 Step 1: Daily Automation
The quiz runs automatically every night on GitHub Actions.
- To trigger manually: **Actions Tab > Daily Quiz Generation > Run workflow**.

## 🔵 Step 2: Deployment Rules
Follow the "Permanent Hosting Split" rules:

1. **Deploying Tools (Firebase)**:
   - Run `firebase deploy` to update [nish-logic.web.app](https://nish-logic.web.app).

2. **Deploying Games (GitHub)**:
   - Run `git push origin master` to update the GitHub URL.

## 🔄 Pool Management (900 Questions)
- **Active Pool**: The webapp maintains a pool of 900 questions (5 days * 180 questions).
- **Storage**: Questions are stored in `games/3-over-match/data/slot_0.json` through `slot_49.json`.
- **Rotation**: Every 5 days, the slots repeat (Day 6 overwrites Day 1).
- **Archiving**: The `archive_to_drive.js` script triggers after batch 10 (midnight). It identifies files in `data/archive/` older than 5 days and moves them to Google Drive.

## ✅ Verification Checklist
1. **GitHub Actions**: Ensure "Daily Quiz Generation" shows a green checkmark every night.
2. **Drive Sync**: Check your "Quiz Archive" folder on Google Drive after 5 days to see the first automated backups.
3. **Local Pool**: Verify that `games/3-over-match/data/` begins to fill up with `slot_X.json` files.

---
**Permanent Note**: Tools (Firebase) and Games (GitHub) must remain on their respective platforms. Tomorrow we proceed with **Expert Analyser**.
