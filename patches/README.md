# Privy recent-wallet list key

`@privy-io/react-auth` 3.51.0 omits the React key for the remembered wallet row in
its default login screen. Signing out and reopening login after a wallet login
therefore produces React's missing-key console error.

The patch adds the login-method identifier as that row's key in both published
module formats. It does not change authentication, wallet selection, or the UI.
`postinstall` applies it with `patch-package --error-on-fail`; the SDK version is
pinned so an update cannot silently bypass the patch. Patch tooling is a production
dependency because production installs also run `postinstall`.

`src/lib/base/privy-login-keys.test.mjs` checks the actual installed SDK renderer.
Remove the patch and its tooling once a Privy release includes the upstream fix.
