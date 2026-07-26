# Be Discipline Mobile

Native iOS and Android community app for turning personal goals into visible,
social accountability.

## Included in this prototype

- Account creation and a quick demo-account path
- Daily exercise, food, and focus commitments
- Photo proof using the device camera or photo library
- Friends-only activity feed
- Friend discovery and add/remove interactions
- Hearts and kudos with haptic feedback
- Device-local persistence for the account, goals, friends, posts, and reactions

## Run locally

```bash
npm install
npx expo start
```

Scan the QR code with a compatible development client, or press `i` for the iOS
simulator and `a` for Android.

## Production backend boundary

This version deliberately uses seeded community content and on-device storage.
Real multi-user accounts require a hosted authentication, database, photo
storage, feed, friend-relationship, reaction, and notification service. The UI
and data shapes in `src/app/index.tsx` are ready to be connected to that layer.
