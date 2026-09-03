# @ricky9w/pi-co-authored-by

A small global [Pi](https://pi.dev) extension that adds stable Pi attribution to direct `git commit -m` commands issued through Pi's `bash` tool.

## Trailers

```text
Co-authored-by: pi <noreply@pi.dev>
Agent-Model: openai-codex/gpt-5.6-terra
```

The service identity is fixed. The model trailer is derived from Pi's active `provider/id`, not a mutable display name.

## Safety model

The extension uses Pi's `tool_call` hook before the built-in `bash` tool executes. It accepts only one direct, unchained `git … commit` command with `-m` or `--message` and blocks unsupported forms. This deliberately avoids trying to implement the Bash grammar or appending flags after a chained command.

It rejects chained commands, redirects, pipes, comments, command substitution, and commits without a message flag. Existing complete attribution is left unchanged; partial attribution is blocked to prevent duplicates.

This covers commits issued by Pi through its `bash` tool. It cannot annotate commits created manually, by another agent, by an IDE, or by arbitrary subprocesses that bypass the Pi bash tool.

## Install

```bash
pi install npm:@ricky9w/pi-co-authored-by
```

Restart Pi or run `/reload` in an existing session after installing.

## Development

```bash
npm install
npm run typecheck
npm test
```

## Publishing

Publishing is performed by `.github/workflows/publish.yml` when a GitHub Release is published. The workflow uses npm Trusted Publishing with GitHub Actions OIDC and does not use an npm token.

One-time bootstrap after the initial manual npm release. `npm trust` requires npm 11.15.0 or newer and an npm account with 2FA enabled:

```bash
npm trust github @ricky9w/pi-co-authored-by \
  --repo ricky9w/pi-co-authored-by \
  --file publish.yml \
  --allow-publish \
  --yes
```

See the release instructions in this repository before publishing the first version.

## License

MIT
