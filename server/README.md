# Walkie Talkie Server Setup

## Prerequisites
- **Termux** app installed on your Android device.
- **zrok** installed in Termux (or ngrok/localtunnel).

## 1. Copy Files to Termux
### Method 1: USB Transfer (Easiest)
1.  **Connect Mobile to PC**: Use a USB cable.
2.  **Enable File Transfer**: On your mobile notification shade, tap "Charging this device via USB" and select **File Transfer / MTP**.
3.  **Copy Folder**: On your PC, copy the `server` folder from this project.
4.  **Paste to Mobile**: Paste it into your phone's `Downloads` folder (Internal Storage).
5.  **Open Termux** on your phone.
6.  **Setup Storage Access**:
    ```bash
    termux-setup-storage
    ```
    (Click 'Allow' on the permission popup).
7.  **Copy to Termux Home**:
    ```bash
    cp -r storage/downloads/server ./
    ```
    *Note: If you pasted it inside a subfolder in Downloads, adjust the path accordingly.*

### Method 2: Wireless (Advanced)
If you have `openssh` installed on Termux, you can use `scp` from your PC:
`scp -r server u0_a123@192.168.1.5:~/` (replace with your Termux user/IP).

## 2. Install Dependencies
Open Termux, navigate to the `server` folder:
```bash
pkg install nodejs
npm install
```

## 3. Run the Server
```bash
node index.js
```
The server will start on port 3000.

## 4. Expose to Internet (zrok)
To allow the Walkie Talkie app (running on 4G/5G or another WiFi) to connect, you need to expose the server.

1.  **Install zrok**:
    Follow instructions at [zrok.io](https://zrok.io).
2.  **Share the port**:
    ```bash
    zrok share public localhost:3000
    ```
3.  **Copy the public URL**:
    e.g., `https://xxxxx.zrok.io`
    You will paste this URL into the Walkie Talkie App.

## Troubleshooting
- If `npm install` fails, ensure you have `nodejs` and `python` installed (`pkg install nodejs python`).
- If permissions errors occur, run `termux-setup-storage` to access storage.
