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

## 🔴 Step 3: Archive
- Quizzes older than 5 days are moved to your [Google Drive Folder](https://drive.google.com/drive/u/0/folders/1O-ZZF_DozitW64U1YAtKqYid1-7Q8R6I).
