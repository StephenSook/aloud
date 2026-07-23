# Native shells (iOS + Android)

Aloud ships as a web app first. These native shells are a Capacitor wrapper of
the **same live web app**: the shell is a signed native container whose WebView
loads `https://aloudbeauty.vercel.app` with native camera and mic entitlements.
Nothing is rewritten, so the accessibility layer and every flow behave exactly
as they do on the web. The web app stays the product and the primary judge URL.

- Bundle id: `com.aloudbeauty.app`, app name `Aloud`.
- Config: `capacitor.config.ts` (loads the live site via `server.url`).
- We load the remote URL because the app relies on server-side Route Handlers
  for its secret-holding API and so cannot be statically exported.

## The gate: prove the iOS WebView camera works first

Before investing in TestFlight, confirm the camera opens inside the iOS shell on
a real iPhone. If it does, proceed. If it does not, iOS stays web-only (Safari
gives the best iOS experience anyway) and we ship Android.

## iOS (Xcode, needs your Apple Developer account)

```bash
npx cap sync ios     # copy config + web assets into the native project
npx cap open ios     # opens the project in Xcode
```

In Xcode:
1. Select the **App** target -> **Signing & Capabilities**.
2. Check **Automatically manage signing**, pick your **Team**. Xcode registers
   the `com.aloudbeauty.app` bundle id and builds a provisioning profile.
3. Connect your iPhone by cable and pick it as the run destination.
4. Press **Run** (the play button). First run: on the phone, trust the cert at
   Settings -> General -> VPN & Device Management.
5. The app launches and loads the live site in the native shell.
6. **Camera gate:** open "Know your skin" -> "I agree, start the camera" and
   confirm the camera opens and speaks guidance. Repeat on "Scan a product".
   Grant the camera/mic prompt when iOS asks. Camera opens = gate passed.

TestFlight (only after the gate passes):
- **Internal testing** (you and your own team, up to 100): no App review, live
  after processing. Best for demo footage and a private link.
- **External testing** (a public link): requires Apple's Beta App Review. A
  WebView wrapper can be rejected under guideline 4.2, so treat the public link
  as a bonus, never a demo dependency.
- Product -> Archive -> Distribute App -> App Store Connect -> Upload, then add
  the build to TestFlight in App Store Connect.

## Android (Android Studio or CLI, produces an installable APK)

```bash
npx cap sync android
npx cap open android   # opens Android Studio; Build -> Build APK(s)
```

Or from the CLI once the Android SDK is installed (ANDROID_HOME set):

```bash
cd android && ./gradlew assembleDebug
# APK at android/app/build/outputs/apk/debug/app-debug.apk
```

Install: transfer the APK to an Android phone, allow "install unknown apps" for
your file manager, tap the APK. Open Aloud, go to a camera flow, grant the
camera/mic prompt, confirm it works. Android's WebView is Chromium, so camera,
barcode, and WebRTC voice all work.

## Keeping the shells current

The shells load the live site, so shipping to the web updates the apps
instantly, with no rebuild. Rebuild the native app only when the Capacitor
config, permissions, icons, or splash change (`npx cap sync` then rebuild).
