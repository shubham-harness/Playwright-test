# Private npm registry demo (mimics Wingstop)

This branch (`private-registry-demo`) reproduces Wingstop's setup: a scoped
dependency pulled from a **private GitHub Packages registry** that needs a
`${TOKEN}` declared in `.npmrc`.

Wingstop:  `@wingstop-inc/design-tokens` + `${WINGSTOP_REGISTRY_TOKEN}`
This demo:  `@shubham-harness/relicx-private-demo` + `${DEMO_REGISTRY_TOKEN}`

> If you publish the demo package under a different GitHub user/org, replace
> `shubham-harness` in `.npmrc`, `package.json`, and the publish step below.

---

## What this branch already changed (done for you)

- `.npmrc` — added:
  ```
  @shubham-harness:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${DEMO_REGISTRY_TOKEN}
  ```
- `package.json` — added dependency `"@shubham-harness/relicx-private-demo": "1.0.0"`.

Layout is unchanged (root `package.json`, `e2e/playwright.config.ts`, tests in
`e2e/tests/ngfe`), so config resolution still picks `e2e/` and ignores
`tunnel-e2e-test/` (its own sub-package).

---

## Step 1 — publish the throwaway private package (one-time, needs your GitHub)

The package source is scaffolded at
`/home/ubuntu/repos/relicx-registry-demo/publishable-package/`
(name already set to `@shubham-harness/relicx-private-demo`).

1. Create a GitHub **classic PAT** with `write:packages` + `read:packages`
   (GitHub → Settings → Developer settings → Personal access tokens → classic).
   If your account/org enforces SSO, click **Configure SSO** on the token and
   authorize it.

2. Publish:
   ```bash
   cd /home/ubuntu/repos/relicx-registry-demo/publishable-package
   printf '@shubham-harness:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\n' "<YOUR_PAT>" > .npmrc
   npm publish
   rm .npmrc        # don't leave the token on disk
   ```

3. Confirm it's there: GitHub → your profile → Packages → `relicx-private-demo`.
   It is private and only readable with a `read:packages` token — the stand-in
   for Wingstop's design-tokens.

---

## Step 2 — (optional) refresh the lockfile so it includes the new dep

`npm install` (what the runner uses) reconciles the lockfile automatically, so
this is optional. If you want a clean committed lock:

```bash
cd /home/ubuntu/repos/Playwright-test
DEMO_REGISTRY_TOKEN=<read-only PAT> npm install
git add package-lock.json
```

---

## Step 3 — push the branch

```bash
cd /home/ubuntu/repos/Playwright-test
git add .npmrc package.json DEMO_PRIVATE_REGISTRY.md package-lock.json
git commit -m "demo: private GitHub Packages dep to mimic Wingstop registry auth"
git push -u origin private-registry-demo
```

Point the Harness build at this branch.

---

## Step 4 — run the demo (the before/after)

### 4a. WITHOUT the token → reproduces Wingstop's failure
- Make sure no `DEMO_REGISTRY_TOKEN` build variable exists.
- Trigger the build (Execution Alias empty = all tests, Project Root empty).
- **Expected:** preflight/shard `npm install` fails with
  `E401 Unauthorized` / `Unable to authenticate` for
  `@shubham-harness/relicx-private-demo`, surfaced in the build-run UI
  (the full npm error block, via `summarize_npm_errors`).

### 4b. WITH the token → the fix
- Add a Harness **secret build variable** named exactly `DEMO_REGISTRY_TOKEN`
  (must match the `.npmrc` placeholder character-for-character) with a
  `read:packages` PAT as the value. Project/org scope so it persists.
- Re-trigger.
- **Expected:** `Resolved N user-defined env var(s) before install: [... 'DEMO_REGISTRY_TOKEN' ...]`,
  `npm install` succeeds, discovery finds the `e2e/tests/ngfe` tests, build passes.

---

## What to point at on the call

- We never read/rewrite their `.npmrc`; **npm** does the `${VAR}` substitution.
  We only guarantee the variable is present in the install environment, and we
  resolve it **before** `npm install` (the ordering fix that originally caused
  the E401 even when the var was set).
- The build-var **name must equal** the `.npmrc` placeholder; no renaming.
- Token needs `read:packages` (not just `repo`); SSO-authorize if the org
  enforces it.
- Set once at project/org scope → every run inherits it. A GitHub PAT lives for
  months/up to a year, so it's per-rotation, not per-build.
- Only short-lived tokens (AWS CodeArtifact ~12h, GitHub App ~1h) would need a
  future pre-install "setup hook" to mint the token at runtime.
