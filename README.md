# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## iPhone and iPad app

The toolkit also runs as a native iOS app. It is the same build as the website, loaded from the app bundle by a Capacitor shell in `ios/`, so it works offline.

```bash
npm run build:ios   # build the site and copy it into the Xcode project
npm run ios         # open the project in Xcode, then Run on a simulator or device
```

Run `npm run build:ios` again after any change to the site. In the app the toolkit always uses the framed layout (banner and content, no IFDM site navigation; see `src/hooks/useFramed.ts`), and downloads (chart PNGs, Excel sheets, the slide deck) go through the iOS share sheet (`src/lib/nativeApp.ts`). The bundle identifier and display name live in `capacitor.config.json` and the Xcode project.
