# 📋 Project Handover: Nish-Logic Portal Fixes & Architecture

Copy and paste this into our next conversation to resume work on **Expert Analyser**.

---

### 🚀 1. The Core Architecture (Permanent Rules)
- **Main URL**: `https://nish-logic.web.app` (Hosted on **Firebase**).
- **Tools**: All future tools (including **Expert Analyser**) will be hosted under the Firebase domain.
- **Games**: Hosted on **GitHub Pages** for free static distribution.
  - *Main Game URL*: [3 Over Match](https://nishantniraj007.github.io/nish-logic/games/3-over-match/index.html)

### 🛠️ 2. What broke & How we fixed it
- **Recursive Conflict**: We had a `server/` folder and multiple `.git` submodules that created a loop, causing "modified content" errors.
  - **FIX**: I **flattened the project**. I deleted the `server` folder and moved all scripts/dependencies to the **Project Root**.
- **Workflow Failures**: GitHub Actions couldn't find dependencies.
  - **FIX**: Consolidated everything into a single `package.json` at root and generated a `package-lock.json`.
- **Coming Soon Error**: The site was showing an old version.
  - **FIX**: Standardized the public folder config in `firebase.json` and performed a clean `firebase deploy`.
- **PDF Headers**: Browser was adding names/URLs to the download.
  - **FIX**: Added `@page { margin: 0; }` to `games/3-over-match/css/quiz.css`.

### 🔄 3. Automation & 900-Question Pool
- **Model**: Strictly using **Gemini 2.5** (Flash-Lite / Flash / Pro).
- **Pool Logic**:
  - **Batch Cycle**: 10 batches (18 Qs each) run every night via **GitHub Actions**.
  - **Active Storage**: Uses 50 rotating slots (`slot_0.json` to `slot_49.json`) to keep **900 active questions** live.
  - **Archiver**: Oldest 180 questions are moved to **Google Drive** only after the 5th day rotation.
- **Difficulty Mapping**:
  - `Easy`: Batches 0-1
  - `Medium`: Batches 2-4
  - `SSC/Bank`: Batches 5-7
  - `UPSC/CAT`: Batches 8-10

### 📁 4. Key Paths for Tomorrow
- **Automation Scripts**: `scripts/generate_daily_quiz.js`, `scripts/archive_to_drive.js`
- **Workflow**: `.github/workflows/daily-quiz-gen.yml`
- **Frontend Logic**: `games/3-over-match/js/quiz.js`
- **Pool Data**: `games/3-over-match/data/`

### 🎯 5. Goal for Tomorrow
- Build the **Expert Analyser** web app using the same Gemini infrastructure.

### ⚡ 6. API Optimization (Plan B)
If tonight's **UPSC/CAT (Pro)** batches time out (longer than 60s):
- **Action**: Split the 18-question request into **3 internal calls of 6 questions each**.
- **Reason**: Loads faster, prevents hangs, and stays within the 1 GH Action run (saving your monthly minutes).
