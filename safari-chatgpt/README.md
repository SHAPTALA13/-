# Safari ChatGPT

A minimal Safari Web Extension that opens a ChatGPT-style popup and sends conversations to the OpenAI Responses API.

## Features

- Chat popup from Safari toolbar.
- Multi-turn conversation in the popup.
- OpenAI Responses API integration.
- Local API-key storage via extension storage.
- Settings page to save/delete the key.
- No API key is committed to the repository.

## Safari packaging

Apple supports Safari Web Extensions built with HTML/CSS/JavaScript and packaged as an iOS or macOS app extension. Use Xcode's Safari Web Extension packager or Apple's web-based App Store Connect packager.

For a Mac with Xcode installed:

```bash
xcrun safari-web-extension-packager ./safari-chatgpt \
  --app-name "Safari ChatGPT" \
  --bundle-identifier "com.shaptala13.safarichatgpt" \
  --copy-resources \
  --no-open
```

Then open the generated `.xcodeproj`, sign the containing app/extension with your Apple development team, build, and enable Safari ChatGPT in Safari's Extensions settings.

## API model

The popup currently uses `gpt-5`. Change the `MODEL` constant in `popup.js` if you want another model available to your project.

## Security note

The API key is intentionally not included in this repository. The extension stores the key locally because a pure Web Extension cannot safely ship a private API credential inside public source code. For a public App Store release, a backend proxy or native Keychain-backed credential flow is preferable.
