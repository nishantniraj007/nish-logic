# Walkie Talkie Client Setup & Build

This project is a React Native app built with Expo. It communicates with the Walkie Talkie Server.

## Prerequisites
- Node.js installed on your computer.
- An Expo account (create at [expo.dev](https://expo.dev)).
- `eas-cli` installed globally (optional but recommended): `npm install -g eas-cli`.

## 1. Install Dependencies
Navigate to the `client` folder and run:
```bash
npm install
```

## 2. Testing Locally (Development)
You can run the app on your phone using the **Expo Go** app without building an APK.
1.  Run `npx expo start`.
2.  Scan the QR code with your Android phone (using Expo Go app) or Camera (iOS).
3.  Enter the Server URL (from your `zrok` output) in the app input field.

## 3. Building the APK (Android)
To get a standalone `.apk` file to share, use **EAS Build**.

1.  **Login to Expo**:
    ```bash
    npx eas login
    ```
2.  **Configure Build**:
    ```bash
    npx eas build:configure
    ```
    Select `Android`. This creates an `eas.json` file.
3.  **Run the Build**:
    ```bash
    npx eas build --platform android --profile preview
    ```
    *Note: The `preview` profile generates an APK you can install directly. The `production` profile generates an AAB for the Play Store.*
4.  **Download APK**:
    Once the build finishes, EAS will provide a link to download the `.apk`.

## 4. Troubleshooting
- **Microphone Permissions**: The app should ask for permission automatically. If denied, enable it in Android Settings.
- **Connection Error**: Ensure the Server URL starts with `https://` (if using zrok) or `http://` (if local).
- **Zrok**: If you restart zrok, the URL changes! You must update it in the app.
