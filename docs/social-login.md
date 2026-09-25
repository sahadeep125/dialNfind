# Sign in with Google and Apple

Customers and providers can sign in with Google or Apple on the website (`web/`), the provider portal (`provider/`), the customer app (`mobile/`) and the business app (`provider-mobile/`). Staff accounts are excluded: they always sign in with email and password.

Each button stays hidden until its IDs are configured, and the API answers `501` until then, so nothing breaks before setup.

## How it works

1. The app gets an **ID token** from Google or Apple:
   - Web and provider portal: Google Identity Services button, Apple JS popup.
   - iOS: native Google Sign-In and native Sign in with Apple.
   - Android: native Google Sign-In, and Apple's web flow in a browser tab.
2. The app sends the token to `POST /api/v1/auth/google` or `POST /api/v1/auth/apple`.
3. The API checks the token's signature, issuer and audience against Google's or Apple's published keys (`server/src/lib/oauth.ts`). When the app sent a nonce, it checks that too.
4. The API then signs the person in (`server/src/services/social-auth.ts`):
   - **Known identity:** signs in to the linked account.
   - **New identity, and the provider reports a verified email that matches an account:** links the identity to that account and signs in.
   - **Otherwise:** creates an account with no password and a confirmed email. Its role is `customer` from `web`/`mobile` and `provider` from `provider`/`provider-mobile`.
5. The response has the same shape as `/auth/login`: `{ token, user, isNewUser }`.

`user.hasPassword` and `user.linkedAccounts` tell the apps whether to ask for a current password when setting one, and whether to ask for a password when deleting the account.

**Apple on Android:** the app opens `appleid.apple.com` in a browser tab. Apple posts the result to `POST /api/v1/auth/apple/callback`. The API redirects to `<app scheme>://auth/apple`, and only schemes listed in `APPLE_APP_REDIRECT_SCHEMES` are allowed. The app then sends the token to `/auth/apple` in the usual way.

**Account deletion:** deleting an account removes its Google/Apple links and revokes our Apple access. The App Store requires the revocation, which uses the refresh token saved from the first Apple sign-in and needs the Sign in with Apple key below. Apple's server-to-server notifications (`POST /api/v1/auth/apple/notifications`) remove a link when someone stops using Sign in with Apple with DialNFind.

## 1. Google Cloud Console

Use one project, under **APIs & Services → Credentials**.

1. **OAuth consent screen:**
   - App name DialNFind, with support email, logo, privacy policy and terms URLs.
   - Scopes `openid`, `email`, `profile`.
   - Publish it; while in "Testing", only listed test users can sign in.
2. **Web application client:**
   - Authorised JavaScript origins:
     - `https://dialnfind.com`
     - `https://business.dialnfind.com`
     - `http://localhost:3000`
     - `http://localhost:5173`
   - No redirect URIs needed.
   - This client ID is:
     - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (web)
     - `VITE_GOOGLE_CLIENT_ID` (provider)
     - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (both apps; it is the audience of the apps' tokens)
3. **iOS clients:** one for each bundle ID, `com.dialnfind.app` and `com.dialnfind.business`. Each app's client ID is its `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. `app.config.ts` turns it into the iOS URL scheme.
4. **Android clients:** one for each package (`com.dialnfind.app`, `com.dialnfind.business`) **and each signing certificate** SHA-1:
   - the debug keystore (`cd android && ./gradlew signingReport`),
   - the EAS upload key (`eas credentials`),
   - the Play App Signing key (Play Console → App integrity).

   Android clients have no ID to configure; Google matches the package name and SHA-1.

Server: set `GOOGLE_CLIENT_IDS` to every client ID above (web and both iOS clients), comma separated.

## 2. Apple Developer

1. **Identifiers → App IDs:**
   - Enable *Sign in with Apple* on `com.dialnfind.app` and `com.dialnfind.business`.
   - Group them, with `com.dialnfind.app` as the primary, so a person gets the same Apple user ID in both apps.
2. **Identifiers → Services IDs:** create one, e.g. `com.dialnfind.signin`, enable *Sign in with Apple*, and configure it:
   - Primary App ID: `com.dialnfind.app`.
   - Domains: `dialnfind.com`, `business.dialnfind.com`, and the API's domain.
   - Return URLs:
     - `https://dialnfind.com/login`
     - `https://business.dialnfind.com/login`
     - `https://<api-domain>/api/v1/auth/apple/callback`
   - Server-to-server notification endpoint: `https://<api-domain>/api/v1/auth/apple/notifications`.
3. **Keys:** create a key with *Sign in with Apple* enabled (linked to the primary App ID) and download the `.p8` file.

Apple's web flow does not accept `localhost` or plain `http`. To try the web and Android flows locally, expose the site and API through an https tunnel (for example ngrok) and add those URLs to the Services ID.

## 3. Environment variables

**server/.env**
```
GOOGLE_CLIENT_IDS="<web>.apps.googleusercontent.com,<ios-app>.apps.googleusercontent.com,<ios-business>.apps.googleusercontent.com"
APPLE_CLIENT_IDS="com.dialnfind.app,com.dialnfind.business,com.dialnfind.signin"
APPLE_SERVICES_ID="com.dialnfind.signin"
APPLE_TEAM_ID="9HH33XNTUX"
APPLE_KEY_ID="<key id>"
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGT...\n-----END PRIVATE KEY-----"
APPLE_APP_REDIRECT_SCHEMES="dialnfind,dialnfind-business"
```

**web/.env**
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<web client id>
NEXT_PUBLIC_APPLE_SERVICES_ID=com.dialnfind.signin
NEXT_PUBLIC_APPLE_REDIRECT_URI=https://dialnfind.com/login
```

**provider/.env**
```
VITE_GOOGLE_CLIENT_ID=<web client id>
VITE_APPLE_SERVICES_ID=com.dialnfind.signin
VITE_APPLE_REDIRECT_URI=https://business.dialnfind.com/login
```

**mobile/.env** and **provider-mobile/.env** (and the EAS environment for builds)
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<this app's iOS client id>
EXPO_PUBLIC_APPLE_SERVICES_ID=com.dialnfind.signin
```

The native modules (`expo-apple-authentication`, `@react-native-google-signin/google-signin`) are not in Expo Go. Build a development client with `npx expo run:ios` / `npx expo run:android` (or `eas build --profile development`). Changing any `EXPO_PUBLIC_GOOGLE_*` value needs a new build.

## 4. Release checklist

- [ ] Google consent screen published, not in testing.
- [ ] Android OAuth clients exist for the Play App Signing SHA-1 of both apps, not just the debug key.
- [ ] `APPLE_PRIVATE_KEY` is set in production (without it, Apple access is not revoked on deletion, which App Review checks).
- [ ] Services ID return URLs and notification URL use the production domains.
- [ ] The API's `CORS_ORIGINS` includes the web and provider origins, as it does for email sign-in.
- [ ] Try each flow on a real device: new account, second sign-in, linking to an existing email account, cancel, sign out and back in, delete account.
