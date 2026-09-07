# InboxForge — Android Native Application & APK Package

This directory contains the production-ready Android wrapper for **InboxForge**, wrapping the full-featured local-first Gmail dot-variant generator, OTP detector, and email testing workspace into a native Android application.

---

## 📱 Application Overview

- **Application ID:** `com.inboxforge.app`
- **Application Name:** `InboxForge`
- **Minimum SDK:** API 26 (Android 8.0 Oreo)
- **Target / Compile SDK:** API 34 (Android 14)
- **Version Name / Code:** `1.0.0` (Code `1`)
- **Architecture:** Kotlin Native Shell + High-Performance Hardware Accelerated WebView + AndroidX Security Crypto

---

## 🔒 Security & Data Safety Guarantees

1. **Encrypted Token Storage (`SecureTokenStore.kt`):**
   - OAuth tokens, refresh tokens, and session keys are secured using `androidx.security.crypto.EncryptedSharedPreferences`.
   - Uses **AES-256-GCM** encryption backed by the hardware Android KeyStore.
   - Credentials are never stored in plain unencrypted local storage.
2. **Zero Hard-Coded Secrets:**
   - No Gmail client secrets, private keys, or API tokens are hardcoded inside the APK source.
3. **Least-Privilege Android Permissions:**
   - Only 3 minimal permissions are requested:
     - `android.permission.INTERNET` (for Gmail API & Firebase sync)
     - `android.permission.ACCESS_NETWORK_STATE` (for live connectivity detection)
     - `android.permission.VIBRATE` (for tactile haptic feedback on user actions)
4. **Isolated Web Security:**
   - File access disabled (`allowFileAccess = false`).
   - Mixed content forbidden (`MIXED_CONTENT_NEVER_ALLOW`).
   - ProGuard / R8 code obfuscation & resource shrinking enabled for release builds.

---

## 🚀 Building the Android APK

### Prerequisites
- Java JDK 17+
- Android SDK Platforms 34 & Build-Tools 34.0.0

### Step 1: Build the Web Application Assets
From the root project directory:
```bash
npm run build
```

### Step 2: Assemble Android APK
From the `android/` directory:

#### Debug APK (Immediate Testing)
```bash
./gradlew assembleDebug
```
Output APK location:
`android/app/build/outputs/apk/debug/app-debug.apk`

#### Release APK (Production)
```bash
./gradlew assembleRelease
```
Output APK location:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 🧩 Native Features & Bridge Modules

- **`InboxForgeNativeBridge.kt`:**
  - `@JavascriptInterface` bridge enabling React to communicate with Android hardware.
  - Tactile Haptics (`triggerHaptic`) with distinct vibration profiles (light, selection, medium, heavy, success, warning).
  - Native Sharing (`shareText`) integrating with Android's system share sheet for identities and OTPs.
  - Secure Keystore Token CRUD (`saveSecureToken`, `getSecureToken`, `removeSecureToken`).
  - Adaptive System Status & Navigation Bar theming (`setStatusBarTheme`).
- **`NetworkStatusObserver.kt`:**
  - Continuously monitors active network connectivity and fires events into the app so offline mode activates automatically without visual freezing or blank screens.
- **`MainActivity.kt`:**
  - Hardware accelerated WebView.
  - Deep-link scheme handler (`inboxforge://auth`) for OAuth callbacks.
  - Hardware Back-Button dispatcher evaluating React modal/tab stacks before exiting.
  - Multi-window handling for Google Sign-In popup dialogs.
