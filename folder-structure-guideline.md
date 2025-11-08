# 1) Repository layout (pragmatic hybrid)

```text
my-repo/
├─ .github/
│  └─ workflows/
│     ├─ ci.yml                  # CI: nix develop --command just ci
│     └─ portability.yml         # Optional matrix (macOS/Ubuntu) smoke tests
├─ .vscode/                      # Optional: editor conveniences
│  └─ settings.json
├─ .gitignore
├─ .envrc                        # Minimal: use flake + dotenv_if_exists .env.local
├─ .env.example                  # Document all runtime env vars (no secrets)
├─ justfile                      # One CLI for the repo (delegates if local justfiles exist)
├─ flake.nix                     # Single source of truth (devShells, checks, helpers)
├─ flake.lock                    # Commit this for reproducibility
├─ .pre-commit-config.yaml       # Pinned format/lint hooks (run local & in CI)
├─ README.md                     # Quickstart + layout + how-to add a service
│
├─ nix/                          # Reusable Nix bits (keeps flake.nix clean)
│  ├─ overlays/                  # Package overrides (pin/fix tools)
│  │  └─ default.nix
│  ├─ modules/                   # Small shared modules (env, shell hooks)
│  │  └─ common.nix
│  └─ pkgs/                      # In-house packages not in nixpkgs (optional)
│
├─ docs/                         # Onboarding, architecture, runbooks, ADRs, etc.
│  ├─ 00-overview.md
│  ├─ 01-bootstrap.md            # Nix/direnv install, binary cache, first steps
│  ├─ 02-secrets.md              # sops-nix / 1Password / SSM patterns
│  ├─ 03-ci-cd.md
│  └─ cheatsheets/
│     ├─ nix.md
│     └─ just.md
│
├─ infra/                        # IaC kept side-by-side (not required for dev shells)
│  ├─ terraform/
│  ├─ helm/
│  └─ docker/
│
├─ scripts/                      # One-off helpers (bootstrap, migrations)
│  └─ bootstrap.sh
│
└─ code/                         # All product code lives here
   ├─ backend/
   │  ├─ microservice1/
   │  │  ├─ src/                 # Service code
   │  │  ├─ tests/
   │  │  ├─ Dockerfile
   │  │  ├─ deploy/              # k8s/helm/compose per-service (optional)
   │  │  │  ├─ k8s/
   │  │  │  └─ compose/
   │  │  ├─ .env.example         # Service-specific runtime vars (optional)
   │  │  └─ justfile             # OPTIONAL: team-owned verbs (dev/test/build/lint/…)
   │  ├─ microservice2/
   │  │  └─ (same pattern)
   │  └─ microservice3/
   │     └─ (same pattern)
   │
   └─ client/
      ├─ web/
      │  ├─ src/
      │  ├─ public/
      │  ├─ package.json
      │  ├─ tsconfig.json
      │  ├─ .env.example
      │  └─ justfile             # OPTIONAL
      └─ flutter/
         ├─ lib/
         ├─ test/
         ├─ pubspec.yaml
         ├─ .env.example
         └─ justfile             # OPTIONAL
```

## What each folder is for (generalized)

* **Root**

  * `flake.nix` / `flake.lock`: **only** source of truth for *toolchains*; guarantees identical dev shells across macOS/Linux/WSL/CI.
  * `justfile`: single, language-agnostic CLI surface (`dev`, `test`, `build`, `lint`, `ci`). Delegates to per-service `justfile` when present; otherwise runs defaults inside the correct devShell.
  * `.envrc` (direnv): convenience auto-loading; repo still works with `nix develop`.
  * `.env.example`: documents all overridable runtime variables; real values go in `.env.local` (gitignored).
  * `.pre-commit-config.yaml`: unified quality gates (formatters/linters) pinned in Nix/CI.

* **`nix/`**

  * `overlays/`: package overrides (e.g., pin `nodejs_20` to a specific upstream tarball).
  * `modules/`: small reusable snippets (env, shell hooks) to keep `flake.nix` tidy.
  * `pkgs/`: build custom tools not available in nixpkgs (optional).

* **`docs/`**: living documentation (bootstrap, architecture, runbooks, ADRs, cheatsheets).

* **`infra/`**: IaC (Terraform/Helm/Compose). Not required to run dev shells, but versioned together.

* **`scripts/`**: one-off helpers (bootstrap, data migration runners, etc.).

* **`code/`**

  * `backend/*`: each microservice self-contained (source, tests, Dockerfile, optional `deploy/`).
  * `client/web`, `client/flutter`: front-end apps.
  * Each service may optionally include a **local `justfile`** to customize its verbs (autonomy) — root will detect and delegate.

---

# 2) Root `flake.nix` (central shells, clean & scalable)

```nix
{
  description = "Pragmatic hybrid monorepo: centralized devShells + optional per-service autonomy";

  inputs = {
    nixpkgs.url      = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url  = "github:numtide/flake-utils";
    # Bring your overlays/modules when you need them:
    # my-overlay.url = "path:./nix/overlays";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; /* overlays = [ my-overlay.overlay ]; */ };

        # Helper: dev shell bound to a sub-path with extra packages
        mkShellFor = path: extraPkgs:
          pkgs.mkShell {
            name = builtins.baseNameOf path;     # e.g., "microservice1"
            buildInputs = with pkgs; [ just direnv git pre-commit ] ++ extraPkgs;
            shellHook = ''
              echo "🔧 ${name} shell (${system})"
              echo "📁 code/${path}"
              test -d "code/${path}" && cd "code/${path}"
            '';
          };
      in {
        # ------------------------------------------
        # Dev shells per domain/service
        # ------------------------------------------
        devShells = {
          backend = {
            microservice1 = mkShellFor "backend/microservice1" [ pkgs.dotnet-sdk_8 ];
            microservice2 = mkShellFor "backend/microservice2" [ pkgs.rustc pkgs.cargo ];
            microservice3 = mkShellFor "backend/microservice3" [ pkgs.go_1_22 ];
          };

          client = {
            web     = mkShellFor "client/web"     [ pkgs.nodejs_20 pkgs.yarn pkgs.typescript ];
            flutter = mkShellFor "client/flutter" [ pkgs.flutter ];
          };
        };

        # Global shell: handy for newcomers / repo-wide chores
        devShells.default = pkgs.mkShell {
          name = "repo-global";
          buildInputs = with pkgs; [
            just direnv git pre-commit
            dotnet-sdk_8 rustc cargo go_1_22 nodejs_20 yarn flutter
          ];
          shellHook = ''echo "🚀 Global dev shell — run: just --list"'';
        };

        # Optional: repo checks for `nix flake check`
        checks.precommit = pkgs.runCommand "precommit" { nativeBuildInputs = [ pkgs.pre-commit ]; } ''
          cd ${self}
          pre-commit run --all-files || true
          touch $out
        '';
      });
}
```

> **Why this works well**
>
> * One place to **upgrade toolchains** for everyone.
> * Service-scoped shells still land you **inside** `code/<service>` for zero friction.
> * No per-service Nix boilerplate required (but you can add it later if truly needed).

---

# 3) Root `justfile` (delegate if local justfile exists; else run defaults)

```just
# Use bash safely
set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

# ------------------------------
# Defaults used only when a service has NO local justfile
# ------------------------------
# Backend defaults
MS1_DEV   := "dotnet watch run"
MS1_TEST  := "dotnet test --nologo"
MS1_BUILD := "dotnet build --nologo -warnaserror"
MS1_LINT  := "dotnet format --verify-no-changes || true"

MS2_DEV   := "cargo run"
MS2_TEST  := "cargo test --all --quiet"
MS2_BUILD := "cargo build --release"
MS2_LINT  := "cargo clippy -- -D warnings || true"

MS3_DEV   := "go run ./..."
MS3_TEST  := "go test ./... -count=1"
MS3_BUILD := "go build ./..."
MS3_LINT  := "golangci-lint run || true"

# Frontend defaults
WEB_DEV   := "npm run dev"
WEB_TEST  := "npm test --silent || pnpm test || true"
WEB_BUILD := "npm run build || pnpm build"
WEB_LINT  := "npm run lint  || pnpm lint  || true"

FLUT_DEV   := "flutter run"
FLUT_TEST  := "flutter test"
FLUT_BUILD := "flutter build apk"
FLUT_LINT  := "flutter analyze || true"

# ------------------------------
# Service registry: name path attr key
# ------------------------------
SVC_LIST := "
ms1      backend/microservice1          devShells.backend.microservice1          MS1
ms2      backend/microservice2          devShells.backend.microservice2          MS2
ms3      backend/microservice3          devShells.backend.microservice3          MS3
web      client/web                     devShells.client.web                     WEB
flutter  client/flutter                 devShells.client.flutter                  FLUT
"

# ------------------------------
# Resolve registry row for a service
# ------------------------------
_resolve service:
    @awk -v s="{{service}}" '$1==s{print $2, $3, $4}' <<< "{{SVC_LIST}}"

# ------------------------------
# Delegate-or-run: VERB ∈ {DEV,TEST,BUILD,LINT}
# ------------------------------
_delegate service verb:
    @read -r path attr key <<< "$($(just --summary _resolve) {{service}})"
    @if [ -f "code/$path/justfile" ]; then
        echo "➡️  Delegating to code/$path/justfile: {{verb,,}}"
        (cd "code/$path" && just {{verb,,}})
    else
        cmd_var="${key}_{{verb}}"; cmd="${!cmd_var}"
        echo "🧰 No local justfile. Running in Nix shell (.#${attr}): ${cmd}"
        nix develop .#"${attr}" --command bash -lc "${cmd}"
    fi

# ------------------------------
# Canonical verbs
# ------------------------------
dev   service:  @just _delegate {{service}} DEV
test  service:  @just _delegate {{service}} TEST
build service:  @just _delegate {{service}} BUILD
lint  service:  @just _delegate {{service}} LINT

# ------------------------------
# Convenience aliases
# ------------------------------
dev-ms1:      dev   ms1
dev-ms2:      dev   ms2
dev-ms3:      dev   ms3
dev-web:      dev   web
dev-flutter:  dev   flutter

test-all:
    just test ms1
    just test ms2
    just test ms3
    just test web
    just test flutter

build-all:
    just build ms1
    just build ms2
    just build ms3
    just build web
    just build flutter

lint-all:
    just lint ms1
    just lint ms2
    just lint ms3
    just lint web
    just lint flutter

ci: lint-all test-all build-all
    @echo "✅ CI OK"

# ------------------------------
# Bootstrap
# ------------------------------
setup: _check-nix _configure-direnv
    @echo "✅ Setup complete"

_check-nix:
    @command -v nix >/dev/null && echo "✅ nix: $(nix --version)" || (echo "❌ Nix required"; exit 1)

_configure-direnv:
    @if command -v direnv >/dev/null; then
        [ -f .envrc ] || { echo "use flake" > .envrc; echo "dotenv_if_exists .env.local" >> .envrc; }
        direnv allow .
        echo "✅ direnv configured"
    else
        echo "ℹ️  direnv not installed (optional). Use 'nix develop' manually."
    fi
```

> **Behavior**
>
> * If `code/<service>/justfile` exists → **delegate** (teams own their verbs).
> * Otherwise → **fallback**: open the proper **Nix devShell** attribute and run a **default** command for that verb.

---

# 4) Expanding with per-service overrides

You have three escalation levels — pick only what you need:

## A) **Local justfile** (recommended first)

Add `code/backend/microservice2/justfile`:

```just
set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

dev:    cargo run
test:   cargo test --all --quiet
build:  cargo build --release
lint:   cargo clippy -- -D warnings

# Optional custom verbs:
migrate:
    diesel migration run
```

Now `just dev ms2` delegates to that file automatically.

## B) **Service-specific env & defaults** (no per-service Nix)

Drop a `.env.example` (and `.env.local`) inside the service; your local `justfile` can read them, or rely on `.envrc` at root which loads `.env.local`.

## C) **Service-specific Nix (advanced/rare)**

If a team really needs a custom toolchain, add a **service `flake.nix`** and call it only from the local `justfile` for advanced tasks. Keep the **root shells canonical** to avoid fragmentation.

Example: `code/backend/microservice3/flake.nix` (pin Go plugin, add db client, etc.). In that service’s `justfile`, you could run:

```just
dev:
    nix develop . --command bash -lc "go run ./cmd/api"
```

…but **only** for special tasks. For everyday `dev/test/build/lint`, prefer the root shells.

## D) Adding a brand-new service (2 edits max)

1. **Create folders**
   `mkdir -p code/backend/billing-service/{src,tests}` and (optionally) add `code/backend/billing-service/justfile`.

2. **Register it**

* In **root `flake.nix`** add a shell:

  ```nix
  devShells.backend.billing = mkShellFor "backend/billing-service" [ pkgs.python312 ];
  ```
* In **root `justfile`** add a row in `SVC_LIST`:

  ```
  billing  backend/billing-service   devShells.backend.billing    BILL
  ```

  and (optionally) a default command set:

  ```
  BILL_DEV   := "pytest -q && uvicorn app:app --reload"
  BILL_TEST  := "pytest -q"
  BILL_BUILD := "python -m build"
  BILL_LINT  := "ruff check . && black --check . || true"
  ```

  You now get `just dev billing` immediately. If later the team adds `code/backend/billing-service/justfile`, root will **auto-delegate**.

---

## 5) First-run & CI flow

**Local (with direnv)**

```bash
git clone <repo>
cd my-repo
# direnv loads nix shell automatically (or run: nix develop)
just setup
just dev ms1
```

**CI (GitHub Actions gist)**

```yaml
- uses: actions/checkout@v4
- uses: cachix/install-nix-action@v26
  with:
    extra_nix_config: |
      experimental-features = nix-command flakes
- uses: cachix/cachix-action@v14
  with:
    name: your-org
    authToken: ${{ secrets.CACHIX_AUTH_TOKEN }}
- name: CI
  run: nix develop --command just ci
```

---

That’s the full, **production-ready hybrid**: a single, reproducible Nix truth; one unified CLI; and painless per-service autonomy whenever a team needs it. To be Added: **`nix/overlays/default.nix`** and **`nix/modules/common.nix`** to round this out even more.
