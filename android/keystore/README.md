## Place release keystores here (gitignored). Never commit *.jks / *.keystore.

Generate a local upload key:

```bash
keytool -genkey -v -keystore android/keystore/vybz-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias vybz
```

Copy `android/key.properties.example` → `android/key.properties` and fill paths/passwords.
See `docs/operations/ANDROID_RELEASE.md`.
