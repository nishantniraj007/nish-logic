# 📌 Resuming Your Walkie Talkie Project

You can safely shut down your PC. All your code is saved.

## 🟢 Step 1: Start the Server (On your Phone)
Whenever you want to work on this, you need the server running on your phone.
1.  Open **Termux**.
2.  Go to the folder:
    ```bash
    cd server
    ```
    *(If you haven't moved it yet, follow the `server/README.md` steps first)*
3.  Start the server:
    ```bash
    node index.js
    ```
4.  **Expose to Internet**:
    Open a *new session* in Termux and run:
    ```bash
    zrok share public localhost:3000
    ```
    (Or `npx localtunnel --port 3000`)
5.  **Copy the new URL**.

## 🔵 Step 2: Build the App (On your PC)
1.  Open a terminal in the project folder:
    ```bash
    cd /home/nishant/.gemini/antigravity/scratch/walkie-talkie/client
    ```
2.  **Build the APK**:
    ```bash
    npx eas build --platform android --profile preview
    ```
3.  Download the APK, install it, and paste the URL from Step 1.
