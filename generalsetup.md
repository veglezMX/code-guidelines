# Portable Development Environments - Ultimate Best Practices Guide

## Overview

This guide documents the definitive approach to creating portable, reproducible development environments across different programming languages and platforms (macOS, Linux, Windows/WSL). It is based on lessons learned from production implementations and incorporates feedback from multiple architectural reviews.

**Three Foundational Principles:**

1. **You cannot simplify what you don't understand** - This guide provides the full picture so architects can make informed trade-offs based on their project's actual needs, not assumptions.

2. **Complex projects deserve complex solutions** - The overhead of proper reproducibility infrastructure is justified by the complete elimination of "works on my machine" problems, onboarding friction, and environment drift.


### Core Principle: Only Nix Should Be Required

**Nix** is the single source of truth for your development environment. Everything else (direnv, task runners, IDE configurations) is convenience layered on top. This ensures that:
- Every developer uses identical tool versions
- CI/CD pipelines match local development exactly
- New team members can be productive in minutes, not days
- Platform differences (macOS vs Linux vs WSL) are handled declaratively
- Environment drift is impossible

### When to Use This Pattern

**Use the full stack when:**
- Multiple developers need identical environments
- You have CI/CD pipelines that must match local development
- You work across multiple platforms (macOS/Linux/WSL)
- Onboarding time matters
- You have multi-language projects or monorepos
- Reproducibility is non-negotiable (compliance, research, etc.)

**You can scale down when:**
- Single developer, single platform projects
- Prototypes or experiments (but even then, Nix helps!)
- You're willing to document manual setup steps (not recommended)

The guide shows the complete pattern; architects can selectively omit components based on actual project constraints, not perceived complexity.

## The Stack

### Required Layer: Nix (Single Source of Truth)

```
┌─────────────────────────────────────────┐
│              Nix (flake.nix)            │
│  • Defines ALL tools and versions      │
│  • Provides default environment vars   │
│  • Works on macOS, Linux, WSL          │
│  • Hermetic, reproducible builds       │
│  • Binary caching for speed            │
└─────────────────────────────────────────┘
```

**Why Nix?**
- **Reproducible**: Exact same environment across all machines
- **Declarative**: Tool versions in code, not tribal knowledge
- **Hermetic**: Isolated from system packages
- **Cross-platform**: Single flake.nix works everywhere
- **Fast**: Binary caching eliminates rebuild time
- **Automatic GC**: Old environments cleaned automatically

**The Learning Curve is Worth It:**
Yes, Nix has a steep learning curve with its functional, declarative paradigm. However:
- One-time investment per organization
- Eliminates weeks of environment debugging
- Pays dividends on first developer onboarding
- See Resources section for learning paths

### Optional Layer: direnv (Convenience)

```
┌─────────────────────────────────────────┐
│            direnv (.envrc)              │
│  • Auto-loads Nix environment on cd    │
│  • Eliminates manual "nix develop"     │
│  • IDE integration friendly            │
│  • Per-project configuration           │
└─────────────────────────────────────────┘
```

**Why direnv?**
- Automatic environment activation on directory change
- Zero mental overhead after setup
- Works with all major IDEs/editors
- Secure with explicit trust model

**Using nix-direnv:**
Standard direnv is slow for Nix. Use `nix-direnv` for caching:
```bash
# Install nix-direnv (recommended)
nix-env -iA nixpkgs.nix-direnv

# Add to ~/.config/direnv/direnvrc or ~/.direnvrc
source $HOME/.nix-profile/share/nix-direnv/direnvrc
```

### Task Runner: Language-Agnostic Commands

```
┌─────────────────────────────────────────┐
│        Task Runner (justfile, etc.)     │
│  • Standardized commands across langs  │
│  • Documents common tasks              │
│  • Uses env_var_or_default() pattern  │
│  • Works with or without direnv        │
└─────────────────────────────────────────┘
```

**Recommended**: `just` (like make but better)
**Alternatives**: `make`, `task`, npm scripts, cargo-make

**Why a task runner?**
- Consistent interface: `just test`, `just build`, `just dev`
- Documents common workflows
- Handles per-language quirks
- Enables `just ci` for reproducible CI/CD

## Configuration Hierarchy

Follow this precedence order (lowest to highest priority):

```
1. flake.nix          → Default values for all developers (COMMIT)
2. flake.lock         → Pinned dependency versions (COMMIT)
3. .envrc             → direnv integration (COMMIT)
4. .env.example       → Template showing overridable values (COMMIT)
5. .env.local         → Personal overrides (GITIGNORE)
6. Environment vars   → Runtime overrides
7. CLI arguments      → Explicit per-invocation overrides
```

### Example Structure

```bash
project/
├── flake.nix           # Nix environment definition (REQUIRED, commit)
├── flake.lock          # Dependency pins (REQUIRED, commit)
├── .envrc              # direnv config (commit, minimal)
├── .env.example        # Configuration template (commit, documentation)
├── .env.local          # Personal settings (GITIGNORE)
├── justfile            # Task runner commands (commit)
├── .pre-commit-config.yaml  # Optional: pre-commit hooks
├── .gitignore          # Includes .env.local, .direnv/, etc.
└── README.md           # Setup instructions
```

## Flake Lock Management

**CRITICAL: Always commit `flake.lock`**

The `flake.lock` file pins exact versions of all dependencies, ensuring reproducibility. Without it, different developers get different nixpkgs versions.

### Update Policy

```bash
# Monthly update cycle (recommended)
nix flake update
nix flake check  # Verify everything still works
git add flake.lock
git commit -m "chore(nix): monthly flake dependencies update"

# Selective updates
nix flake lock --update-input nixpkgs

# See what changed
nix flake metadata
git diff flake.lock
```

### In CI/CD

```yaml
# GitHub Actions example
- name: Check flake
  run: nix flake check --all-systems
```

Never skip `flake.lock` commits. This is the contract for reproducibility.

## Binary Caching

**Without binary caching, initial builds are slow.** This hurts adoption and CI performance.

### Organization-Level Cache with Cachix

```nix
# flake.nix - Add substituters
{
  nixConfig = {
    extra-substituters = [
      "https://cache.nixos.org"
      "https://your-org.cachix.org"
    ];
    extra-trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
      "your-org.cachix.org-1:YOUR_PUBLIC_KEY_HERE"
    ];
  };
}
```

### Setup Cachix

```bash
# Install cachix
nix-env -iA cachix -f https://cachix.org/api/v1/install

# Use your org's cache
cachix use your-org

# In CI, push builds
cachix push your-org $(nix-build)
```

### GitHub Actions Integration

```yaml
- uses: cachix/cachix-action@v14
  with:
    name: your-org
    authToken: ${{ secrets.CACHIX_AUTH_TOKEN }}

- name: Build
  run: nix build .#checks.x86_64-linux.ci
```

**Benefits:**
- First build after clean checkout: seconds instead of minutes
- CI builds reuse developer builds
- Shared cache across team and CI
- Automatic cache warming

## Implementation Pattern (Language-Agnostic)

### Generic Project Structure

This pattern works for any language ecosystem. The key is to define your toolchain and dependencies in Nix, then use standard commands via the task runner.

**flake.nix (Template)**:
```nix
{
  description = "Generic Project Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Core development tools (always include)
            just
            direnv
            git
            
            # Add your language toolchain here
            # Examples:
            # - dotnet-sdk_8
            # - jdk17
            # - nodejs_20
            # - python312
            # - go_1_22
            # - rustc and cargo
            
            # Add build tools and dependencies
            # Examples:
            # - gcc
            # - cmake
            # - pkg-config
            
            # Add supporting services/tools
            # Examples:
            # - postgresql
            # - redis
            # - docker-client
            # - kubectl
          ];

          shellHook = ''
            echo "🔧 Development Environment Loaded"
            echo "Project: $(basename $PWD)"
            
            # Print tool versions for verification
            # Customize based on your tools:
            # echo "Language: $(your-tool --version)"
            
            if [ ! -f ".setup-complete" ]; then
              echo ""
              echo "Run: just setup"
            fi
          '';

          # Environment variables
          # Use generic variables that work across contexts
          
          # Application configuration
          APP_ENV = "development";
          LOG_LEVEL = "info";
          
          # Server configuration
          PORT = "8080";
          HOST = "localhost";
          
          # Database connection
          # DATABASE_URL = "postgresql://localhost:5432/devdb";
          # DATABASE_HOST = "localhost";
          # DATABASE_PORT = "5432";
          # DATABASE_NAME = "devdb";
          
          # Cache/Message Queue
          # REDIS_URL = "redis://localhost:6379";
          # REDIS_HOST = "localhost";
          # REDIS_PORT = "6379";
          
          # API Configuration
          # API_BASE_URL = "http://localhost:8080";
          # API_TIMEOUT = "30";
          
          # Feature flags
          # ENABLE_FEATURE_X = "false";
          # ENABLE_DEBUG_MODE = "true";
          
          # Build configuration
          # BUILD_MODE = "debug";
          # OPTIMIZATION_LEVEL = "0";
        };

        # CI checks (customize per project)
        checks = {
          format = pkgs.runCommand "check-format" {
            buildInputs = [ ];  # Add your formatter
          } ''
            cd ${self}
            # Run your format check command
            touch $out
          '';
          
          lint = pkgs.runCommand "check-lint" {
            buildInputs = [ ];  # Add your linter
          } ''
            cd ${self}
            # Run your lint command
            touch $out
          '';
        };
      });
}
```

**justfile (Template)**:
```justfile
# Project Commands
# These are standard verbs - implement them for your language/framework

# Environment variables with defaults
export APP_ENV := env_var_or_default('APP_ENV', 'development')
export PORT := env_var_or_default('PORT', '8080')
export LOG_LEVEL := env_var_or_default('LOG_LEVEL', 'info')

# Database variables
export DATABASE_URL := env_var_or_default('DATABASE_URL', 'postgresql://localhost:5432/devdb')
export DATABASE_HOST := env_var_or_default('DATABASE_HOST', 'localhost')
export DATABASE_PORT := env_var_or_default('DATABASE_PORT', '5432')

# Redis/Cache variables
export REDIS_URL := env_var_or_default('REDIS_URL', 'redis://localhost:6379')
export REDIS_HOST := env_var_or_default('REDIS_HOST', 'localhost')

# Build configuration
export BUILD_MODE := env_var_or_default('BUILD_MODE', 'debug')

# Setup project dependencies
setup: _check-nix _install-deps _configure-direnv
    @echo "✅ Setup complete!"
    @touch .setup-complete
    @echo ""
    @echo "Next steps:"
    @if command -v direnv >/dev/null 2>&1; then \
        echo "  1. Exit and re-enter directory: cd .. && cd -"; \
        echo "  2. Environment will auto-load!"; \
    else \
        echo "  1. Run: nix develop"; \
        echo "  2. Or install direnv for auto-loading"; \
    fi

# Run tests
test:
    @echo "Running tests..."
    # Add your test command here
    # Examples:
    # - dotnet test
    # - mvn test
    # - npm test
    # - pytest
    # - go test ./...
    # - cargo test

# Build the project
build:
    @echo "Building project..."
    # Add your build command here
    # Examples:
    # - dotnet build
    # - mvn package
    # - npm run build
    # - go build
    # - cargo build --release

# Start development server
dev:
    @echo "Starting development server on port {{PORT}}..."
    # Add your dev server command here
    # Examples:
    # - dotnet watch run
    # - mvn spring-boot:run
    # - npm run dev
    # - go run main.go
    # - cargo watch -x run

# Run linter
lint:
    @echo "Running linter..."
    # Add your lint command here
    # Examples:
    # - dotnet format --verify-no-changes
    # - mvn checkstyle:check
    # - npm run lint
    # - golangci-lint run
    # - cargo clippy -- -D warnings

# Format code
format:
    @echo "Formatting code..."
    # Add your format command here
    # Examples:
    # - dotnet format
    # - mvn spotless:apply
    # - npm run format
    # - go fmt ./...
    # - cargo fmt

# Clean build artifacts
clean:
    @echo "Cleaning build artifacts..."
    # Add your clean command here
    # Examples:
    # - dotnet clean
    # - mvn clean
    # - rm -rf node_modules dist build
    # - go clean
    # - cargo clean
    rm -f .setup-complete

# Database migrations (if applicable)
migrate:
    @echo "Running database migrations..."
    # Add your migration command here
    # Examples:
    # - dotnet ef database update
    # - mvn flyway:migrate
    # - npm run migrate
    # - go run migrations/main.go
    # - diesel migration run

# Run all CI checks
ci: lint test build
    @echo "✅ All CI checks passed"

# Force re-setup (removes .setup-complete)
setup-force:
    rm -f .setup-complete
    @just setup

# Internal: Check Nix is available
_check-nix:
    @if ! command -v nix >/dev/null 2>&1; then \
        echo "❌ Nix not found!"; \
        echo "Install: https://nixos.org/download.html"; \
        exit 1; \
    fi
    @echo "✅ Nix found: $(nix --version)"

# Internal: Install language-specific dependencies
_install-deps:
    @echo "📦 Installing dependencies..."
    # Add your dependency installation command here
    # Examples:
    # - dotnet restore
    # - mvn dependency:resolve
    # - npm install
    # - go mod download
    # - cargo fetch

# Internal: Configure direnv
_configure-direnv:
    @if command -v direnv >/dev/null 2>&1; then \
        echo "📁 Configuring direnv..."; \
        if [ ! -f ".envrc" ]; then \
            echo "use flake" > .envrc; \
            echo "dotenv_if_exists .env.local" >> .envrc; \
        fi; \
        direnv allow .; \
        echo "✅ direnv configured"; \
    else \
        echo "⚠️  direnv not found (optional but recommended)"; \
        echo "Install: brew install direnv (macOS) or apt-get install direnv (Linux)"; \
    fi
```

### Adapting for Your Language/Framework

**Step 1: Define your toolchain in flake.nix**

Search for packages: https://search.nixos.org/packages

```nix
# Example: .NET project
buildInputs = with pkgs; [
  dotnet-sdk_8
  just
  direnv
];

# Example: Java project
buildInputs = with pkgs; [
  jdk17
  maven
  just
  direnv
];

# Example: Multi-language project
buildInputs = with pkgs; [
  nodejs_20
  python312
  postgresql
  redis
  docker-client
  just
  direnv
];
```

**Step 2: Set language-specific environment variables**

```nix
# .NET example
shellHook = ''
  echo "🔧 .NET $(dotnet --version)"
  export DOTNET_CLI_TELEMETRY_OPTOUT=1
  export DOTNET_NOLOGO=true
'';

# Java example
shellHook = ''
  echo "☕ Java $(java -version 2>&1 | head -n 1)"
  export JAVA_HOME=${pkgs.jdk17}
  export MAVEN_OPTS="-Xmx2g"
'';
```

**Step 3: Implement justfile commands for your toolchain**

Replace the template commands with your actual build/test/run commands.

### Example: Containerized Application

For applications that run in containers, your development environment can manage both the application and container tooling:

**flake.nix**:
```nix
{
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Your application language/framework
            # (add what you need)
            
            # Container tooling
            docker-client
            docker-compose
            kubectl
            kubernetes-helm
            
            # Task runner
            just
            direnv
          ];

          shellHook = ''
            echo "🐳 Docker $(docker --version)"
            echo "☸️  kubectl $(kubectl version --client --short)"
            
            if [ ! -f ".setup-complete" ]; then
              echo "Run: just setup"
            fi
          '';

          # Container-related variables
          DOCKER_BUILDKIT = "1";
          COMPOSE_DOCKER_CLI_BUILD = "1";
          
          # Application configuration
          APP_ENV = "development";
          PORT = "8080";
          
          # Database (for docker-compose)
          DATABASE_HOST = "localhost";
          DATABASE_PORT = "5432";
          DATABASE_NAME = "devdb";
          DATABASE_USER = "devuser";
          # DATABASE_PASSWORD set in .env.local
          
          # Redis
          REDIS_HOST = "localhost";
          REDIS_PORT = "6379";
        };
      });
}
```

**justfile for containerized app**:
```justfile
# Container-based application commands
export APP_ENV := env_var_or_default('APP_ENV', 'development')
export PORT := env_var_or_default('PORT', '8080')
export DATABASE_URL := env_var_or_default('DATABASE_URL', 'postgresql://devuser:devpass@localhost:5432/devdb')

setup: _check-nix _configure-direnv
    @echo "✅ Setup complete!"
    @touch .setup-complete

# Start all services via docker-compose
services-up:
    docker-compose up -d
    @echo "✅ Services running"
    @echo "Database: localhost:5432"
    @echo "Redis: localhost:6379"

# Stop all services
services-down:
    docker-compose down

# View service logs
logs:
    docker-compose logs -f

# Build container image
docker-build:
    docker build -t myapp:latest .

# Run application locally (with services in containers)
dev: services-up
    @echo "Starting application on port {{PORT}}..."
    # Your run command here

# Run tests
test: services-up
    @echo "Running tests..."
    # Your test command here

# Run tests in container
test-docker:
    docker-compose run --rm app test

# Clean everything
clean: services-down
    docker-compose down -v
    rm -f .setup-complete

ci: test
    @echo "✅ CI checks passed"
```

## Bootstrap Process (Universal)

### 1. Prerequisites Section (README.md)

```markdown
## Prerequisites

### Required

**[Nix](https://nixos.org/download.html)** with flakes enabled:

```bash
# Install Nix (multi-user recommended)
curl -L https://nixos.org/nix/install | sh -s -- --daemon

# Enable flakes (required)
mkdir -p ~/.config/nix
cat >> ~/.config/nix/nix.conf << EOF
experimental-features = nix-command flakes
EOF

# Verify installation
nix --version
nix flake --help
```

### Optional (Recommended)

**[direnv](https://direnv.net/)** - Auto-loads environment on `cd`:

```bash
# macOS
brew install direnv nix-direnv

# Linux (Debian/Ubuntu)
sudo apt-get install direnv
nix-env -iA nixpkgs.nix-direnv

# Linux (Fedora)
sudo dnf install direnv
nix-env -iA nixpkgs.nix-direnv

# Configure direnv with nix-direnv
mkdir -p ~/.config/direnv
cat >> ~/.config/direnv/direnvrc << EOF
source \$HOME/.nix-profile/share/nix-direnv/direnvrc
EOF

# Hook into your shell
# For bash (~/.bashrc):
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc

# For zsh (~/.zshrc):
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc

# For fish (~/.config/fish/config.fish):
echo 'direnv hook fish | source' >> ~/.config/fish/config.fish

# Reload shell
source ~/.bashrc  # or ~/.zshrc
```

### System Requirements

- **macOS**: 10.15+ (Intel or Apple Silicon)
- **Linux**: Any distribution with Nix support
- **Windows**: WSL2 (Ubuntu 20.04+ recommended)
```

### 2. Setup Instructions (README.md)

```markdown
## Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd <project>

# 2. Enter Nix environment
nix develop

# 3. Run setup (installs dependencies, configures direnv)
just setup

# 4. Exit and re-enter to activate direnv (if installed)
cd .. && cd -

# Environment now auto-loads on cd! 🎉
```

### Alternative: Without direnv

```bash
# Always use `nix develop` before working
nix develop
just test
just build
```

### Troubleshooting Setup

**Slow first build?**
- Enable binary caching (see Binary Caching section)
- Use `--print-build-logs` to see progress: `nix develop --print-build-logs`

**direnv not activating?**
- Verify hook: `type direnv` should show a shell function
- Check `.envrc` was created: `ls -la .envrc`
- Manually allow: `direnv allow .`

**Flake evaluation errors?**
- Update flake: `nix flake update`
- Check syntax: `nix flake check`
- See detailed errors: `nix develop --show-trace`
```

### 3. .envrc (Minimal, Security-Conscious)

```bash
# Load Nix flake environment
use flake

# Set project root for scripts/tools
export PROJECT_ROOT="$PWD"

# Load local overrides (gitignored)
dotenv_if_exists .env.local
dotenv_if_exists .env

# Optional: Load secrets from external sources
# Example: 1Password CLI
# if command -v op >/dev/null 2>&1; then
#   export DATABASE_PASSWORD=$(op read "op://Dev/database/password")
# fi
```

**Security Notes:**
- `.envrc` requires explicit trust: `direnv allow .`
- Review `.envrc` before allowing (it executes arbitrary code)
- Use `.envrc.local` (gitignored) for personal tweaks
- Never commit secrets to `.envrc`

### 4. justfile setup recipe (Universal Pattern)

```justfile
# Project setup
setup: _check-nix _install-deps _configure-direnv
    @echo "✅ Setup complete!"
    @touch .setup-complete
    @echo ""
    @echo "Next steps:"
    @if command -v direnv >/dev/null 2>&1; then \
        echo "  1. Exit and re-enter directory: cd .. && cd -"; \
        echo "  2. Environment will auto-load!"; \
    else \
        echo "  1. Run: nix develop"; \
        echo "  2. Or install direnv for auto-loading"; \
    fi

# Force re-setup (removes .setup-complete)
setup-force:
    rm -f .setup-complete
    @just setup

# Internal: Check Nix is available
_check-nix:
    @if ! command -v nix >/dev/null 2>&1; then \
        echo "❌ Nix not found!"; \
        echo "Install: https://nixos.org/download.html"; \
        exit 1; \
    fi
    @echo "✅ Nix found: $(nix --version)"

# Internal: Install language-specific dependencies
_install-deps:
    @echo "📦 Installing dependencies..."
    # Add language-specific commands here
    # Python: pip install --user -e ".[dev]"
    # Node: pnpm install
    # Go: go mod download
    # Rust: cargo fetch

# Internal: Configure direnv
_configure-direnv:
    @if command -v direnv >/dev/null 2>&1; then \
        echo "📁 Configuring direnv..."; \
        if [ ! -f ".envrc" ]; then \
            echo "use flake" > .envrc; \
            echo "dotenv_if_exists .env.local" >> .envrc; \
        fi; \
        direnv allow .; \
        echo "✅ direnv configured"; \
    else \
        echo "⚠️  direnv not found (optional but recommended)"; \
        echo "Install: brew install direnv (macOS) or apt-get install direnv (Linux)"; \
    fi

# Clean all generated files
clean:
    @echo "🧹 Cleaning..."
    # Add language-specific clean commands
    rm -f .setup-complete
    @echo "✅ Clean complete"
```

### 5. .env.example (Documentation)

```bash
# Project Configuration Template
# Copy to .env.local for personal customization: cp .env.example .env.local

# ===================
# Platform Notes
# ===================
# macOS: Works on both Intel and Apple Silicon
# Linux: Tested on Ubuntu 22.04, Debian 12, Fedora 39
# Windows: Use WSL2 (Ubuntu 20.04+)

# ===================
# Application Settings
# ===================

# Environment (development, staging, production)
#APP_ENV=development

# Log level (debug, info, warn, error)
#LOG_LEVEL=info

# Server configuration
#PORT=8080
#HOST=localhost

# ===================
# Database Configuration
# ===================

# Connection string (adjust for your database)
#DATABASE_URL=postgresql://localhost:5432/devdb

# Or separate components
#DATABASE_HOST=localhost
#DATABASE_PORT=5432
#DATABASE_NAME=devdb
#DATABASE_USER=devuser
#DATABASE_PASSWORD=your_password_here

# ===================
# Cache/Message Queue
# ===================

# Redis
#REDIS_URL=redis://localhost:6379
#REDIS_HOST=localhost
#REDIS_PORT=6379

# ===================
# API Configuration
# ===================

# External API endpoints
#API_BASE_URL=http://localhost:8080
#API_TIMEOUT=30
#API_KEY=your_development_api_key

# ===================
# Feature Flags
# ===================

#ENABLE_FEATURE_X=false
#ENABLE_DEBUG_MODE=true
#ENABLE_PROFILING=false

# ===================
# Build Configuration
# ===================

#BUILD_MODE=debug
#OPTIMIZATION_LEVEL=0

# ===================
# Container Configuration
# ===================

#DOCKER_BUILDKIT=1
#COMPOSE_PROJECT_NAME=myproject

# ===================
# Secrets Management
# ===================
# NEVER commit actual secrets!
# Use one of these approaches:
#   1. .env.local (gitignored)
#   2. 1Password CLI: op read "op://vault/item/field"
#   3. sops-nix/agenix for encrypted secrets in repo
#   4. External secrets manager (AWS SSM, HashiCorp Vault)

# Example with 1Password:
# In .envrc:
#   if command -v op >/dev/null 2>&1; then
#     export SECRET_KEY=$(op read "op://Dev/app/secret_key")
#   fi
```

### 6. .gitignore (Universal Entries)

```gitignore
# ===================
# Environment
# ===================
.env
.env.*
!.env.example
.envrc.local

# ===================
# Setup tracking
# ===================
.setup-complete

# ===================
# direnv
# ===================
.direnv/

# ===================
# Nix (keep flake.lock!)
# ===================
result
result-*

# ===================
# IDE
# ===================
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# ===================
# Build artifacts (adjust for your language)
# ===================
bin/
build/
dist/
target/
out/
*.exe
*.dll
*.so
*.dylib

# ===================
# Dependencies (adjust for your language)
# ===================
node_modules/
vendor/

# ===================
# Test artifacts
# ===================
coverage/
*.coverage
htmlcov/
.pytest_cache/
*.test
*.out

# ===================
# Logs
# ===================
*.log
logs/

# ===================
# Temporary files
# ===================
*.tmp
*.temp
*.bak
*.swp
*~
```

## CI/CD Integration

### Core Principle: Identical Environments

CI/CD must use **exactly** the same Nix environment as local development.

### GitHub Actions Example

**.github/workflows/ci.yml**:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  check:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest]
    
    steps:
      - uses: actions/checkout@v4
      
      # Install Nix with flakes
      - uses: cachix/install-nix-action@v26
        with:
          extra_nix_config: |
            experimental-features = nix-command flakes
            
      # Setup binary cache
      - uses: cachix/cachix-action@v14
        with:
          name: your-org
          authToken: ${{ secrets.CACHIX_AUTH_TOKEN }}
      
      # Verify flake
      - name: Check flake
        run: nix flake check --all-systems
      
      # Run CI in Nix environment
      - name: Run CI
        run: nix develop --command just ci
      
      # Optional: Build and push to cache
      - name: Build derivations
        run: |
          nix build .#checks.$(nix eval --raw .#currentSystem).ci
          nix build .#devShells.$(nix eval --raw .#currentSystem).default
```

### GitLab CI Example

**.gitlab-ci.yml**:
```yaml
image: nixos/nix:latest

variables:
  NIX_CONFIG: "experimental-features = nix-command flakes"

before_script:
  - nix --version
  - nix flake show

stages:
  - check
  - test
  - build

flake-check:
  stage: check
  script:
    - nix flake check --all-systems

test:
  stage: test
  script:
    - nix develop --command just test
  coverage: '/TOTAL.*\s+(\d+%)$/'

build:
  stage: build
  script:
    - nix develop --command just build
  artifacts:
    paths:
      - bin/
      - dist/
```

### CI Justfile Target

Add a `ci` target that runs all checks:

```justfile
# Run all CI checks locally
ci: lint test build
    @echo "✅ All CI checks passed"
    @echo "Ready to push!"

# What CI runs (for reference)
ci-info:
    @echo "CI runs the following:"
    @echo "  1. nix flake check"
    @echo "  2. just lint"
    @echo "  3. just test"
    @echo "  4. just build"
```

## Secrets Management

**Never commit secrets.** Use one of these approaches:

### 1. Local Development: .env.local

```bash
# .env.local (gitignored)
DATABASE_URL=postgresql://localhost:5432/devdb
API_KEY=dev_key_12345
```

### 2. sops-nix for Encrypted Secrets in Repo

```nix
# flake.nix
{
  inputs = {
    sops-nix.url = "github:Mic92/sops-nix";
  };

  outputs = { self, nixpkgs, sops-nix }:
    # ... in devShell
    imports = [ sops-nix.nixosModules.sops ];
    
    sops = {
      defaultSopsFile = ./secrets.yaml;
      age.keyFile = "/home/user/.config/sops/age/keys.txt";
    };
}
```

```yaml
# secrets.yaml (encrypted with sops)
database_password: ENC[AES256_GCM,data:...,tag:...]
api_key: ENC[AES256_GCM,data:...,tag:...]
```

### 3. 1Password CLI Integration

```bash
# .envrc or justfile
if command -v op >/dev/null 2>&1; then
  export DATABASE_PASSWORD=$(op read "op://Dev/database/password")
  export API_KEY=$(op read "op://Dev/api/key")
fi
```

### 4. External Secrets Manager

```bash
# justfile with AWS SSM example
[private]
load-secrets:
    #!/usr/bin/env bash
    if command -v aws >/dev/null 2>&1; then
      export DB_PASSWORD=$(aws ssm get-parameter --name /dev/db/password --with-decryption --query Parameter.Value --output text)
    fi

dev: load-secrets
    # Start development server with secrets loaded
```

### Security Checklist

- [ ] `.env.local` in `.gitignore`
- [ ] `.env.example` documents secret names (not values)
- [ ] Secrets loaded at runtime, not build time
- [ ] CI secrets use GitHub Secrets / GitLab Variables
- [ ] Production uses proper secrets manager (Vault, SSM, etc.)
- [ ] No secrets in Nix store (it's world-readable!)

## IDE Integration

### VS Code

**Option 1: direnv Extension (Recommended)**

```json
// .vscode/settings.json
{
  "direnv.restart.automatic": true,
  "direnv.path.executable": "direnv"
}
```

Install: `ext install mkhl.direnv`

**Option 2: Dev Containers with Nix**

```json
// .devcontainer/devcontainer.json
{
  "name": "Project Dev Container",
  "image": "nixos/nix:latest",
  "features": {
    "ghcr.io/devcontainers/features/nix:1": {
      "version": "latest",
      "extraNixConfig": "experimental-features = nix-command flakes"
    }
  },
  "postCreateCommand": "nix develop --command just setup",
  "customizations": {
    "vscode": {
      "extensions": [
        "jnoortheen.nix-ide",
        "arrterian.nix-env-selector"
      ]
    }
  }
}
```

**Finding Tool Paths:**

When VS Code needs to find language servers, compilers, or interpreters:

```bash
# Inside nix develop, find tool paths
which your-tool
# Example: which dotnet, which java, which node

# List all available tools
ls -la .direnv/nix-profile-*/bin/

# Use in VS Code settings.json
{
  "your.tool.path": "${workspaceFolder}/.direnv/nix-profile-*/bin/your-tool"
}
```

### JetBrains IDEs (IntelliJ, Rider, PyCharm, WebStorm, etc.)

1. Install **Nix Idea Plugin**
2. Configure Project SDK to use Nix-provided tools
3. For language-specific SDKs:
   - Find tool path: `which your-tool` inside `nix develop`
   - Set SDK path to `.direnv/nix-profile-*/bin/your-tool`
4. IDE will use Nix environment automatically

### Vim/Neovim

**With direnv support:**
```vim
" In .vimrc or init.vim
Plugin 'direnv/direnv.vim'

" Or for Neovim with Lua
require('direnv').setup()
```

LSPs will automatically use Nix-provided language servers.

### Emacs

```elisp
;; In .emacs or init.el
(use-package direnv
  :config
  (direnv-mode))
```

## Organization-Level Reuse

**Problem**: Every project creates `flake.nix` from scratch.

**Solution**: Org-level templates and shared modules.

### Flake Templates

Create a templates repository:

```bash
# your-org/devshell-templates
templates/
├── web-service/
│   ├── flake.nix
│   ├── justfile
│   └── .envrc
├── api-service/
│   ├── flake.nix
│   ├── justfile
│   └── .envrc
├── cli-tool/
└── data-pipeline/
```

**templates/web-service/flake.nix**:
```nix
{
  description = "Web Service Project Template";
  
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system};
      in {
        # Template content here - add your language toolchain
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Add tools for web service development
            just
            direnv
          ];
        };
      });
}
```

**Root flake.nix**:
```nix
{
  description = "Org Dev Shell Templates";

  outputs = { self }:
    {
      templates = {
        web-service = {
          path = ./templates/web-service;
          description = "Web service with standard tooling";
        };
        
        api-service = {
          path = ./templates/api-service;
          description = "API service template";
        };
        
        cli-tool = {
          path = ./templates/cli-tool;
          description = "Command-line tool template";
        };
        
        data-pipeline = {
          path = ./templates/data-pipeline;
          description = "Data processing pipeline template";
        };
      };
    };
}
```

### Using Templates

```bash
# Initialize new project
nix flake init -t github:your-org/devshell-templates#web-service
just setup
```

### Shared Modules

For common configuration across projects:

```nix
# shared-devshell.nix (in your org's nixpkgs overlay)
{ pkgs }:
{
  common = {
    buildInputs = with pkgs; [
      just
      direnv
      pre-commit
      git
    ];
    
    shellHook = ''
      echo "🏢 Your Org Dev Environment"
      echo "Using shared configuration"
    '';
  };
  
  commonEnv = {
    COMPANY_NAME = "Your Org";
    CI = "false";
  };
}
```

**Import in project flake.nix**:
```nix
{
  inputs = {
    org-devshell.url = "github:your-org/devshell-config";
  };

  outputs = { self, nixpkgs, org-devshell }:
    let
      shared = org-devshell.lib.${system};
    in {
      devShells.default = pkgs.mkShell {
        buildInputs = shared.common.buildInputs ++ [
          # Project-specific tools
        ];
        
        shellHook = shared.common.shellHook + ''
          # Project-specific hook
        '';
      };
    };
}
```

## Pre-Commit Hooks Integration

Unify and pin all code quality checks with `pre-commit`.

**flake.nix**:
```nix
{
  inputs = {
    pre-commit-hooks.url = "github:cachix/pre-commit-hooks.nix";
  };

  outputs = { self, nixpkgs, flake-utils, pre-commit-hooks }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        checks = {
          pre-commit-check = pre-commit-hooks.lib.${system}.run {
            src = ./.;
            hooks = {
              # Nix
              nixpkgs-fmt.enable = true;
              
              # Python
              black.enable = true;
              ruff.enable = true;
              mypy.enable = true;
              
              # JavaScript
              eslint.enable = true;
              prettier.enable = true;
              
              # Rust
              rustfmt.enable = true;
              clippy.enable = true;
              
              # General
              trailing-whitespace.enable = true;
              end-of-file-fixer.enable = true;
            };
          };
        };

        devShells.default = pkgs.mkShell {
          inherit (self.checks.${system}.pre-commit-check) shellHook;
          buildInputs = self.checks.${system}.pre-commit-check.enabledPackages;
        };
      });
}
```

**Setup**:
```bash
# Installed automatically by shellHook
# To manually install:
pre-commit install

# Test all files
pre-commit run --all-files
```

## Migration Strategy

### Phase 1: Add Nix Alongside Existing Setup

**Goal**: Prove Nix works without disrupting current workflows.

```bash
# 1. Add flake.nix to existing project
nix flake init

# 2. Customize for your tools
# Edit flake.nix to match your current tool versions

# 3. Test it works
nix develop
# Run your existing commands

# 4. Document in README
# Add "Alternative: Use Nix" section

# 5. Commit
git add flake.nix flake.lock
git commit -m "Add Nix development environment (optional)"
```

**Communication**: "Nix is now available as an option for reproducible environments."

### Phase 2: Add Task Runner (just)

**Goal**: Standardize commands across the team.

```bash
# 1. Add justfile with existing commands
# Example: just test -> npm test

# 2. Update README with just commands

# 3. Team can use either:
#   - New way: nix develop --command just test
#   - Old way: npm test

# 4. Commit
git add justfile
git commit -m "Add justfile for standardized commands"
```

### Phase 3: Add direnv

**Goal**: Eliminate manual `nix develop`.

```bash
# 1. Add .envrc
echo "use flake" > .envrc

# 2. Document direnv setup in README

# 3. Auto-configure in `just setup`

# 4. Commit
git add .envrc
git commit -m "Add direnv for automatic environment loading"
```

### Phase 4: Make Nix Primary (Optional)

**Goal**: Deprecate manual setup instructions.

```bash
# 1. Update README to lead with Nix setup
# 2. Move old setup to "Manual Setup (Not Recommended)"
# 3. Update CI/CD to use Nix
# 4. Remove redundant tool version documentation
```

### For Monorepos

**Strategy**: Start with one package/service.

```
monorepo/
├── flake.nix              # Org-wide base configuration
├── packages/
│   ├── service-a/
│   │   ├── flake.nix      # Inherits from root + specifics
│   │   └── justfile
│   └── service-b/
│       ├── flake.nix
│       └── justfile
```

**Root flake.nix** (workspace):
```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      pkgs = import nixpkgs { system = "x86_64-linux"; };
      
      # Shared tools for all packages
      commonTools = with pkgs; [
        just
        direnv
        git
      ];
    in
    {
      # Shared module
      lib.mkDevShell = extraInputs: pkgs.mkShell {
        buildInputs = commonTools ++ extraInputs;
      };
      
      # Default dev shell for root
      devShells.x86_64-linux.default = self.lib.mkDevShell [];
    };
}
```

**Package flake.nix**:
```nix
{
  inputs = {
    root.url = "path:../..";
    nixpkgs.follows = "root/nixpkgs";
  };

  outputs = { self, nixpkgs, root }:
    {
      devShells.x86_64-linux.default = root.lib.mkDevShell [
        # Package-specific tools
        nixpkgs.legacyPackages.x86_64-linux.nodejs_20
      ];
    };
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Slow Nix Evaluation

**Symptom**: `nix develop` takes minutes to start.

**Solutions**:
```bash
# Enable binary caching (see Binary Caching section)
# Use nix-direnv for caching
nix-env -iA nixpkgs.nix-direnv

# Reduce flake inputs (less to evaluate)
# Use nix flake archive to debug
nix flake archive --json | jq
```

#### 2. Flake Attribute Errors

**Error**: `error: flake does not provide attribute 'packages.x86_64-linux.default'`

**Solution**:
```bash
# Check available outputs
nix flake show

# Verify your system
nix eval --raw .#currentSystem

# Use explicit system
nix develop .#devShells.x86_64-linux.default
```

#### 3. direnv Not Activating

**Symptom**: Environment not loading on `cd`.

**Solutions**:
```bash
# Check direnv is hooked
type direnv  # Should show a shell function

# Check .envrc exists
ls -la .envrc

# Manually allow
direnv allow .

# Check for errors
direnv status
```

#### 4. VS Code Python Interpreter Not Found

**Solution**:
```bash
# Find direnv Python path
ls -la .direnv/

# Set in VS Code settings.json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.direnv/python-3.12-*/bin/python"
}

# Or use interpreter selector (Cmd+Shift+P → Python: Select Interpreter)
```

#### 5. Binary Cache Authentication Fails

**Symptom**: `error: unable to download 'https://cache.nixos.org/...'`

**Solutions**:
```bash
# Check network
curl -I https://cache.nixos.org

# Verify substituters in nix.conf
nix show-config | grep substituters

# For corporate proxies, set:
nix --option http-proxy http://proxy.corp.com:8080 develop
```

#### 6. Disk Space Issues

**Symptom**: `/nix/store` filling up disk.

**Solutions**:
```bash
# Run garbage collection
nix-collect-garbage --delete-older-than 30d

# For aggressive cleanup
nix-collect-garbage -d

# Check store size
du -sh /nix/store

# Optimize (deduplicates)
nix-store --optimise
```

#### 7. Platform-Specific Build Failures

**Error**: `unsupported platform x86_64-darwin`

**Solution**:
```nix
# In flake.nix, make platform-specific
{
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Platform-specific packages
        linuxOnly = if pkgs.stdenv.isLinux then [ pkgs.systemd ] else [];
        darwinOnly = if pkgs.stdenv.isDarwin then [ pkgs.darwin.apple_sdk.frameworks.Security ] else [];
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [ pkgs.common-tool ] ++ linuxOnly ++ darwinOnly;
        };
      });
}
```

### Performance Optimization

**Evaluation Time**:
```bash
# Profile evaluation
nix eval --raw .#devShells.$(nix eval --raw .#currentSystem).default --show-trace

# Use lazy attribute evaluation
# Avoid unnecessary inputs
```

**Build Time**:
```bash
# Parallel builds
nix develop --max-jobs auto

# Use more cores
nix develop --cores 8
```

**Disk Usage**:
```bash
# Regular cleanup schedule (cron/systemd timer)
0 0 * * 0 nix-collect-garbage --delete-older-than 30d

# Optimize store weekly
0 0 * * 0 nix-store --optimise
```

## Best Practices

### DO ✅

1. **Single Source of Truth**: All tool versions and dependencies in `flake.nix`
2. **Commit flake.lock**: Always commit for reproducibility
3. **Binary Caching**: Use Cachix or org-level cache
4. **Minimal .envrc**: Just `use flake` + overrides
5. **Document Everything**: `.env.example` with platform notes and secret templates
6. **Auto-configure direnv**: In `just setup` with detection
7. **Use env_var_or_default()**: For overridable values in justfile
8. **First-time detection**: `.setup-complete` marker
9. **Clear Prerequisites**: Nix required, direnv optional but recommended
10. **Platform-specific docs**: macOS, Linux, WSL nuances
11. **Helpful Messages**: Guide users through setup with clear echoes
12. **Cross-platform paths**: Forward slashes, avoid hardcoded paths
13. **Pre-commit hooks**: Pin checks in Nix
14. **CI/CD matches local**: Use same Nix environment
15. **Secrets external**: Never in Nix store or git
16. **Pure Python**: No `.venv`, use Nix packages
17. **Language toolchain pinning**: fenix for Rust, Corepack for Node
18. **Monthly flake updates**: Via PR with CI checks
19. **Org-level templates**: Standardize across repos
20. **Escape hatches**: Allow `--impure` for specific use cases with documentation

### DON'T ❌

1. **Don't hardcode absolute paths**: Use relative paths or `$PWD`
2. **Don't duplicate config**: One value, one location
3. **Don't require direnv**: Make it optional
4. **Don't install system-wide**: Use Nix for tools
5. **Don't commit .env.local**: Always gitignore
6. **Don't mix concerns**: Nix=tools, direnv=loading, just=tasks
7. **Don't assume OS**: Support macOS, Linux, WSL
8. **Don't hide the process**: Show users what's happening
9. **Don't use nested variables**: `export VAR := "{{OTHER}}"` breaks in just
10. **Don't create .venv in Nix**: Use pure Python approach
11. **Don't skip flake.lock commits**: Breaks reproducibility
12. **Don't put secrets in flake.nix**: Use runtime loading
13. **Don't ignore performance**: Enable caching, optimize
14. **Don't skip CI checks**: `nix flake check` catches issues early
15. **Don't use outdated patterns**: Follow language-specific best practices
16. **Don't over-abstract early**: Start simple, add complexity as needed
17. **Don't ignore platform differences**: Test on all targets
18. **Don't forget garbage collection**: Schedule regular cleanup
19. **Don't trust .envrc blindly**: Review before `direnv allow`
20. **Don't assume expertise**: Document everything for all skill levels

### Configuration Patterns

**Purity Levels**:

```nix
# Level 1: Pure (preferred)
mkShell {
  buildInputs = [ /* all tools */ ];
  # No environment passthrough
}

# Level 2: Controlled impurity (when needed)
mkShell {
  buildInputs = [ /* all tools */ ];
  
  # Explicitly whitelist passthrough
  shellHook = ''
    export AWS_PROFILE="''${AWS_PROFILE:-default}"
    export SSH_AUTH_SOCK="''${SSH_AUTH_SOCK:-}"
  '';
}

# Level 3: Impure (document why)
mkShell {
  buildInputs = [ /* all tools */ ];
  
  # For interactive development only
  # CI should not use this
  __impure = true;
}
```

**Environment Variable Precedence**:

```justfile
# Good: Allows overrides at every level
export DATABASE_URL := env_var_or_default('DATABASE_URL', 'postgresql://localhost/dev')

# Bad: Hardcoded, no override
export DATABASE_URL := 'postgresql://localhost/dev'
```

## Testing Portability

### Automated Checks

Add to your CI:

```yaml
# .github/workflows/portability.yml
name: Portability Test

on: [push, pull_request]

jobs:
  test-platforms:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, macos-13]  # macos-13 is Intel
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      - uses: cachix/install-nix-action@v26
      - name: Fresh clone test
        run: |
          nix develop --command just setup
          nix develop --command just test
```

### Manual Testing Checklist

- [ ] Fresh clone on macOS (Apple Silicon) → `nix develop` → `just setup` → works
- [ ] Fresh clone on macOS (Intel) → works
- [ ] Fresh clone on Linux (Ubuntu) → works
- [ ] Fresh clone on WSL2 → works
- [ ] Without direnv installed → `nix develop` → works
- [ ] With direnv → auto-loads → works
- [ ] CI runs successfully → green build
- [ ] New developer onboarding < 10 minutes
- [ ] `just ci` locally → passes
- [ ] Binary cache hit rate > 90%
- [ ] All tool versions pinned → reproducible
- [ ] No `--impure` needed (or documented if needed)
- [ ] Secrets not in git → verified
- [ ] IDE integration works → LSPs functional
- [ ] Cross-language (if applicable) → all ecosystems work

### Reproducibility Verification

**Test that two developers get identical environments:**

```bash
# Developer A
nix develop --command sh -c 'which python && python --version' > dev-a.txt

# Developer B (different machine)
nix develop --command sh -c 'which python && python --version' > dev-b.txt

# Compare
diff dev-a.txt dev-b.txt  # Should be identical (except machine paths)
```

**Test that CI matches local:**

```bash
# Local
nix develop --command just test > local-test.log

# Compare with CI logs
# Tool versions should be identical
```

## Real-World Example

This guide itself is based on a production implementation. See reference repository structure:

```
project/
├── flake.nix              # Multi-language/multi-service environment
├── flake.lock             # Committed, updated monthly
├── .envrc                 # Minimal: use flake + .env.local
├── .env.example           # Complete documentation
├── .env.local             # Gitignored, personal overrides
├── justfile               # Task runner with env_var_or_default()
├── .gitignore             # Includes all necessary entries
├── .github/
│   └── workflows/
│       └── ci.yml         # Uses nix develop --command just ci
├── .pre-commit-config.yaml
├── packages/
│   ├── service-a/         # Backend service
│   ├── service-b/         # Frontend application
│   └── tools/             # CLI utilities
└── README.md              # Clear bootstrap instructions

Setup time for new developer: ~5 minutes
Binary cache hit rate: 95%
Platforms supported: macOS (both arch), Ubuntu, WSL2
Team size: 12 developers, 0 "works on my machine" issues in 6 months
```

## Advanced Topics

### GPU/CUDA Support (Conditional)

For ML/AI workloads that need GPU support on Linux:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    nixpkgs-cuda.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs, nixpkgs-cuda, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # CUDA only on Linux
        cudaPackages = if pkgs.stdenv.isLinux 
          then with nixpkgs-cuda.legacyPackages.${system}; [
            cudatoolkit
            cudnn
          ]
          else [];
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Your language/framework tools
            # ...
          ] ++ cudaPackages;
          
          shellHook = ''
            ${if pkgs.stdenv.isLinux then ''
              export CUDA_PATH=${pkgs.cudatoolkit}
              export LD_LIBRARY_PATH=${pkgs.cudatoolkit}/lib:$LD_LIBRARY_PATH
              echo "✅ CUDA available: ${pkgs.cudatoolkit}"
            '' else ''
              echo "⚠️  CUDA not available on this platform"
            ''}
          '';
        };
      });
}
```

### Private Package Registries

**Generic pattern for private package access:**

```nix
devShells.default = pkgs.mkShell {
  shellHook = ''
    # Set up authentication for private registries
    # This varies by ecosystem, but common patterns:
    
    # 1. Private Git repositories
    git config --global url."git@github.com:your-org/".insteadOf "https://github.com/your-org/"
    
    # 2. Token-based authentication
    export PRIVATE_REGISTRY_TOKEN="$(cat ~/.config/private-registry/token 2>/dev/null || echo '')"
    
    # 3. Certificate-based authentication
    export SSL_CERT_FILE="$HOME/.config/certs/private-ca.pem"
    
    # 4. Proxy configuration for corporate networks
    # export http_proxy="http://proxy.corp.com:8080"
    # export https_proxy="http://proxy.corp.com:8080"
  '';
};
```

**Common registry configurations:**

```bash
# In .env.local or .envrc
# Package registry
REGISTRY_URL=https://registry.company.com
REGISTRY_TOKEN=your_token_here

# Container registry
CONTAINER_REGISTRY=registry.company.com
CONTAINER_USER=your_username
# CONTAINER_PASSWORD set via secrets manager

# Artifact repository
ARTIFACT_URL=https://artifacts.company.com
# Authentication via .netrc or tool-specific config
```

### Multi-Version Support

Run multiple versions of tools for compatibility testing:

```nix
{
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells = {
          # Default - latest stable version
          default = pkgs.mkShell {
            buildInputs = [ pkgs.your-tool-latest ];
          };
          
          # LTS version for compatibility
          lts = pkgs.mkShell {
            buildInputs = [ pkgs.your-tool-lts ];
          };
          
          # Bleeding edge for testing
          edge = pkgs.mkShell {
            buildInputs = [ pkgs.your-tool-unstable ];
          };
        };
      });
}
```

**Usage:**
```bash
# Default
nix develop

# LTS version
nix develop .#lts

# Edge version
nix develop .#edge
```

### Platform-Specific Packages

Handle packages that only work on certain platforms:

```nix
{
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Platform-specific packages
        linuxOnly = if pkgs.stdenv.isLinux 
          then [ pkgs.systemd pkgs.inotify-tools ]
          else [];
          
        darwinOnly = if pkgs.stdenv.isDarwin
          then [ pkgs.darwin.apple_sdk.frameworks.Security ]
          else [];
          
        # Architecture-specific
        x86Only = if pkgs.stdenv.isx86_64
          then [ /* x86-specific tools */ ]
          else [];
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Cross-platform tools
            just
            direnv
          ] ++ linuxOnly ++ darwinOnly ++ x86Only;
        };
      });
}
```

## FAQ

### Architecture and Design

**Q: Why not just use Docker?**
A: Docker is excellent for runtime/deployment, but adds overhead for development (volume mounts are slow on macOS, extra layer of indirection). Nix provides native tools without containers. You can use both: Nix for dev tools, Docker for deployment. Some teams even build Docker images with Nix for reproducible containers.

**Q: Can I use this with Docker?**
A: Absolutely! Use Nix for developer tools, Docker for application runtime:
```bash
# justfile
docker-build:
    nix develop --command docker build -t myapp .
```

**Q: What about Windows (not WSL)?**
A: Nix requires Unix-like environment. For Windows:
- **Recommended**: Use WSL2 (Ubuntu 20.04+)
- **Alternative**: Use Dev Containers with Nix inside
- **Native Windows**: Not currently supported by Nix

**Q: How does this scale to large teams?**
A: Extremely well. Benefits increase with team size:
- Eliminates onboarding variability
- Org-level templates standardize practices
- Binary caching amortizes build costs
- No more tool version mismatches
- CI/CD matches local exactly

**Q: What's the learning curve?**
A: **Nix itself**: Steep (functional, declarative paradigm). Budget 1-2 weeks for team lead to become proficient. **This pattern**: Shallow. Developers just run `nix develop` and `just setup`. Most don't need to understand Nix internals.

**Investment strategy**:
- Week 1: Team lead learns Nix, sets up first flake
- Week 2: Team uses new environment, lead refines
- Month 1+: Template reuse, benefits compound

### Technical Details

**Q: How do I handle different versions of system libraries (OpenSSL, etc.)?**
A: Nix provides them:
```nix
buildInputs = with pkgs; [
  openssl_3  # or openssl_1_1 if needed
  postgresql_15
  # Nix handles conflicting versions
];
```

**Q: What if someone doesn't want to install Nix?**
A: Document manual tool installation from `flake.nix` in README's "Manual Setup" section. However, reproducibility cannot be guaranteed without Nix.

**Q: Can I use this in CI/CD?**
A: Yes! That's a primary use case. CI runs `nix develop --command just ci` for 100% reproducible builds. See CI/CD Integration section.

**Q: How do I update dependencies?**
A: 
```bash
# Update all inputs
nix flake update

# Verify
nix flake check

# Commit
git add flake.lock
git commit -m "chore: update flake inputs"
```

Recommended: Monthly update cycle via automated PR.

**Q: What about secrets?**
A: Never commit secrets. Use:
1. `.env.local` (gitignored) for development
2. sops-nix/agenix for encrypted secrets in repo
3. External secrets manager (1Password, Vault, AWS SSM) for production

See Secrets Management section for details.

**Q: How do I debug Nix evaluation?**
A:
```bash
# Show trace
nix develop --show-trace

# Very verbose
nix develop --print-build-logs --verbose

# Check flake
nix flake check

# Show what's available
nix flake show
```

**Q: Can I mix Nix with existing tools (asdf, mise, etc.)?**
A: Not recommended. Choose one:
- **Nix-only**: Best reproducibility
- **Hybrid**: Possible but complex, can lead to conflicts
- **Other tools**: No Nix, no guarantees

**Q: How much disk space does Nix use?**
A: `/nix/store` grows over time. Typical usage:
- Small project: ~500MB - 2GB
- Large monorepo: ~5GB - 10GB
- With garbage collection: Stable at ~5GB

Run `nix-collect-garbage` regularly. See Troubleshooting section.

### Workflow and Adoption

**Q: How do I convince my team to adopt this?**
A: Start with data:
- Calculate time lost to environment issues (conservative: 1 hour/week/developer)
- Show onboarding time: Manual (days) vs Nix (minutes)
- Demonstrate: "This works on my machine, does it work on yours?" → always yes

Adoption path:
1. Pilot with one project/team
2. Measure: onboarding time, "works on my machine" incidents, CI consistency
3. Share results with leadership
4. Roll out org-wide with templates

**Q: What if my language/tool isn't in nixpkgs?**
A: Options:
1. **Package it yourself** (advanced): https://nixos.org/manual/nixpkgs/stable/#chap-quick-start
2. **Use generic builders**: `pkgs.stdenv.mkDerivation`
3. **Fetch binaries**: `pkgs.fetchurl` for prebuilt binaries
4. **Request addition**: https://github.com/NixOS/nixpkgs/issues

Many tools are already packaged. Search: https://search.nixos.org/packages

**Q: Can I gradually migrate an existing project?**
A: Yes! See Migration Strategy section. TL;DR:
1. Add `flake.nix` alongside existing setup
2. Add `justfile` for standardized commands
3. Add `direnv` for auto-loading
4. Make Nix primary (optional)

Each phase is independent.

**Q: How do I handle per-developer preferences?**
A: Use `.env.local`:
```bash
# .env.local (gitignored)
LOG_LEVEL=debug  # I like verbose logs
EDITOR=vim       # My editor preference
```

Or `.envrc.local` for direnv-specific tweaks.

**Q: What about macOS Apple Silicon vs Intel?**
A: Nix handles it automatically:
```nix
flake-utils.lib.eachDefaultSystem  # Works on both
```

Platform-specific packages:
```nix
darwinOnly = if pkgs.stdenv.isDarwin then [
  pkgs.darwin.apple_sdk.frameworks.Security
] else [];
```

**Q: How do I share common configuration across repos?**
A: See Organization-Level Reuse section. Create flake templates or shared modules.

**Q: Can I use this with GitHub Codespaces / GitPod?**
A: Yes! Add `devcontainer.json`:
```json
{
  "image": "nixos/nix:latest",
  "postCreateCommand": "nix develop --command just setup"
}
```

### Security and Compliance

**Q: Is Nix secure?**
A: Generally yes, but:
- **Supply chain**: Nix fetches from GitHub (nixpkgs), verify inputs
- **Binary cache**: Trust official caches (cache.nixos.org), use TLS
- **Secrets**: Never in Nix store (world-readable), use runtime loading
- **Updates**: Nix itself and nixpkgs get security updates

For high-security environments:
- Pin nixpkgs to audited revision
- Use org-level binary cache
- Scan `/nix/store` with security tools
- Implement software supply chain policies

**Q: Can I use this in a corporate environment with strict policies?**
A: Yes, with considerations:
- **Firewall**: Nix fetches from GitHub/cache.nixos.org, allowlist needed
- **Air-gapped**: Use offline nixpkgs mirror
- **Approval**: Nix tool requires sudo on first install
- **Storage**: `/nix/store` requires root ownership

Work with IT/Security to:
1. Allowlist Nix domains
2. Set up org binary cache
3. Document approval process

**Q: How do I audit what Nix is doing?**
A:
```bash
# See what will be built
nix develop --dry-run

# Trace evaluation
nix develop --show-trace

# Inspect store paths
nix path-info --recursive <derivation>

# Check for vulnerabilities (not built-in, use external tools)
```

## Resources

### Learning Nix

**Start here:**
- [Zero to Nix](https://zero-to-nix.com/) - Interactive tutorial
- [Nix Pills](https://nixos.org/guides/nix-pills/) - Deep dive into Nix
- [Official Nix Manual](https://nixos.org/manual/nix/stable/)

**Nix Flakes:**
- [Nix Flakes Wiki](https://nixos.wiki/wiki/Flakes)
- [Practical Nix Flakes](https://serokell.io/blog/practical-nix-flakes)

**nixpkgs:**
- [nixpkgs Manual](https://nixos.org/manual/nixpkgs/stable/)
- [Package Search](https://search.nixos.org/packages)

### Related Tools

- [direnv](https://direnv.net/) - Environment switcher
- [nix-direnv](https://github.com/nix-community/nix-direnv) - Fast direnv+Nix
- [just](https://github.com/casey/just) - Command runner
- [Cachix](https://cachix.org/) - Nix binary cache service

### Community

- [NixOS Discourse](https://discourse.nixos.org/)
- [Nix Matrix Chat](https://matrix.to/#/#nix:nixos.org)
- [r/NixOS Reddit](https://reddit.com/r/nixos)
- [Nix Weekly Newsletter](https://weekly.nixos.org/)

### This Pattern

- Original pattern developed from production use cases
- Informed by architectural reviews from multiple perspectives
- Continuously updated based on team feedback
- Open to contributions and improvements

## Contributing to This Pattern

Found an improvement? Have a better language-specific example? Discovered a pitfall?

**Ways to contribute:**
- Better language-specific examples
- Additional platform support (BSD, etc.)
- Improved bootstrap UX
- Common pitfalls and solutions
- Performance optimizations
- Security best practices
- Corporate environment tips

**Guidelines:**
- Maintain purity stance (no hybrid impurities)
- Provide working code examples
- Test on multiple platforms
- Document trade-offs clearly
- Consider complexity tiers (simple → medium → complex)

## Metrics for Success

Track these to measure impact:

### Onboarding Time
- **Before**: Days to weeks for new developer productivity
- **Target**: < 30 minutes from clone to productive

### Environment Issues
- **Before**: "Works on my machine" incidents per sprint
- **Target**: Zero environment-related issues

### CI Consistency
- **Before**: CI passes, local fails (or vice versa)
- **Target**: 100% CI/local parity

### Setup Reproducibility
- **Before**: Manual wiki instructions, often outdated
- **Target**: Single command (`just setup`), always works

### Tool Version Drift
- **Before**: Developers on different tool versions
- **Target**: Zero version mismatches

### Binary Cache Hit Rate
- **Before**: N/A (no caching)
- **Target**: > 90% cache hits in CI

## Summary

**Core Principles:**
1. **Nix is the single source of truth** for tools and dependencies
2. **direnv is convenience** for auto-loading (optional but recommended)
3. **Task runner standardizes commands** across languages and projects
4. **Pure, reproducible environments** eliminate "works on my machine"
5. **Binary caching** makes it fast
6. **Secrets stay external** to Nix and git
7. **CI/CD matches local** exactly
8. **Org-level reuse** scales the pattern

**Key Files:**
- `flake.nix` - Tool versions, environment (COMMIT)
- `flake.lock` - Dependency pins (COMMIT)
- `.envrc` - direnv config (COMMIT)
- `.env.example` - Configuration template (COMMIT)
- `.env.local` - Personal overrides (GITIGNORE)
- `justfile` - Standardized commands (COMMIT)

**Bootstrap:**
1. Install Nix (required) and direnv (optional)
2. Clone repo
3. `nix develop`
4. `just setup`
5. Exit and re-enter (if direnv)
6. Profit

**Reproducibility Guarantee:**
With `flake.lock` committed and Nix installed, every developer and CI environment gets identical tools, versions, and dependencies. Always. Across macOS, Linux, and WSL. No exceptions.

**When Complexity is Worth It:**
- Multi-developer teams
- CI/CD pipelines
- Cross-platform development
- Compliance requirements
- Long-lived projects
- Onboarding matters
- "Works on my machine" is unacceptable

This pattern eliminates an entire class of problems. The investment pays dividends from day one and compounds over time.

*"You cannot simplify what you don't understand. Complex projects deserve complex solutions. Reproducibility is binary."*