# iOS signing artefacts

- `IOS_BUILDS.json` — written by `npm run smoke:ios:ipa` (CI or local after archive).
- Never commit `.p12`, `.mobileprovision`, or App Store Connect API keys.
- GitHub Actions secrets: `IOS_CERT_BASE64`, `IOS_CERT_PWD`, `IOS_PROV_PROFILE_BASE64`.
