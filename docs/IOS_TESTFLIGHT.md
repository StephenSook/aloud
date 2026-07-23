# iOS to TestFlight, with the least possible manual work

## What is already done (automated, verified)

- The iOS shell **compiles** (`xcodebuild ... BUILD SUCCEEDED`) and **runs**: it
  launches in the iOS Simulator and loads the live app with full fidelity.
- Camera + mic permission strings are set in `Info.plist`.
- The whole signing + archive + TestFlight upload is scripted in
  `fastlane/Fastfile` (lane `beta`), authenticated by an API key so it runs with
  no interactive prompts.

The only things that genuinely need you are an Apple account credential (Apple
will not let software create it) and, at the very end, looking at your phone to
confirm the camera opens.

## The one thing you do: make an App Store Connect API key (about 3 minutes)

1. Go to https://appstoreconnect.apple.com → **Users and Access** →
   **Integrations** → **App Store Connect API** (Team Keys).
2. Click **+**, name it `Aloud CI`, role **App Manager**, **Generate**.
3. **Download** the `.p8` file (you can only download it once). Save it in the
   repo at `fastlane/AuthKey.p8` (this path is gitignored, it will not be
   committed).
4. From the same page, copy the **Key ID** (10 characters) and the **Issuer ID**
   (the UUID at the top of the Keys list).
5. Get your **Team ID** (10 characters) from
   https://developer.apple.com/account → **Membership details**.

Do **not** paste the `.p8` contents into chat, it is a secret. Just save the
file and tell me the three IDs, or set the four values yourself and run it.

## Then I (or you) run one command

```bash
export ASC_KEY_ID=XXXXXXXXXX
export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
export ASC_KEY_PATH="$PWD/fastlane/AuthKey.p8"
export APPLE_TEAM_ID=XXXXXXXXXX
fastlane beta
```

`fastlane beta` will, with no further prompts:
1. Create the `Aloud` app record in App Store Connect (bundle id
   `com.aloudbeauty.app`) if it does not exist.
2. Create the distribution certificate and App Store provisioning profile via
   the API key.
3. Set a fresh build number, archive, and export an App Store `.ipa`.
4. Upload it to TestFlight.

If Apple rejects the name `Aloud` (app names are globally unique) or the run
hits an account-specific detail, that surfaces here and I fix it, no Xcode.

## Last step, on your phone (the camera gate)

1. In App Store Connect → your app → **TestFlight**, add yourself as an
   **Internal** tester (internal testing needs **no** Beta App Review, so the
   build is usable as soon as it finishes processing, about 15 to 30 minutes).
2. Install **Aloud** from the **TestFlight** app on your iPhone.
3. Open **Know your skin** and **Scan a product**, grant the camera/mic prompt,
   and confirm the camera opens and speaks. That is the gate.

If the camera works, iOS is done. If it does not, iOS stays the excellent web
app in Safari and we lead on Android plus the web link. No cable, no Xcode, no
UDID at any point.
