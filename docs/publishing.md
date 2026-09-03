# Publishing

This package publishes publicly to npm as `@ricky9w/pi-co-authored-by`. Releases after version `0.1.0` use npm Trusted Publishing via GitHub Actions OIDC.

## One-time bootstrap

1. Create or sign in to the npm account that owns the `@ricky9w` scope:

   ```bash
   npm login
   npm whoami
   ```

2. Upgrade to npm 11.15.0 or newer. Earlier npm versions may expose an incomplete `npm trust` command and fail with HTTP 400:

   ```bash
   npm install -g npm@latest
   npm --version
   ```

3. Enable two-factor authentication on that npm account. `npm login` only authenticates; it does not enroll 2FA:

   ```bash
   npm profile enable-2fa auth-and-writes
   ```

   Follow the QR-code/authenticator setup prompts, then confirm the status with `npm profile get`.

4. From a clean checkout, validate and publish the first version manually. This bootstrap publish may prompt for your npm 2FA code:

   ```bash
   npm ci
   npm run typecheck
   npm test
   npm pack --dry-run
   npm publish --access public
   ```

5. Create the npm-to-GitHub trust relationship:

   ```bash
   npm trust github @ricky9w/pi-co-authored-by \
     --repo ricky9w/pi-co-authored-by \
     --file publish.yml \
     --allow-publish \
     --yes
   ```

   The workflow filename must match `.github/workflows/publish.yml`. This creates a trusted relationship for that exact GitHub repository and workflow.

6. Confirm the trusted publisher in npm package settings. No `NPM_TOKEN` GitHub secret is needed or should be configured.

## Subsequent releases

1. Update `version` in `package.json` using a SemVer-compatible release version; npm will reject an already-published version.
2. Commit and push the version change.
3. Create and publish a GitHub Release for the matching tag, for example `v0.1.1`.
4. The workflow installs exact dependencies, runs type checks and tests, then runs:

   ```bash
   npm publish --provenance --access public
   ```

The workflow requires `id-token: write` to request GitHub's OIDC token. For public repositories and public packages, npm attaches provenance to a Trusted Publishing release.

## Security notes

- Keep the repository public so users can inspect the extension source before installation.
- Do not add an npm access token to GitHub Actions once Trusted Publishing is configured.
- Restrict GitHub repository write access; any writer can alter the trusted workflow or publish a release.
