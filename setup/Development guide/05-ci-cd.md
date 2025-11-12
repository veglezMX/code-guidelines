# 5. Continuous Integration with GitLab

GitLab CI/CD automates testing, building, and deployment for component libraries. A well-configured pipeline catches issues early, maintains quality standards, and deploys Storybook documentation automatically.

## Complete .gitlab-ci.yml pipeline structure

```yaml
image: node:20-alpine

stages:
  - install
  - lint
  - test
  - build
  - deploy

variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"
  FF_USE_FASTZIP: "true"
  ARTIFACT_COMPRESSION_LEVEL: "fastest"

default:
  cache: &global_cache
    key:
      files:
        - package-lock.json
      prefix: npm-$CI_COMMIT_REF_SLUG
    fallback_keys:
      - npm-$CI_DEFAULT_BRANCH
      - npm-default
    paths:
      - .npm/
    policy: pull

install-dependencies:
  stage: install
  cache:
    <<: *global_cache
    policy: pull-push
  script:
    - npm ci --cache .npm --prefer-offline
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH
    - if: $CI_COMMIT_TAG

lint:eslint:
  stage: lint
  needs:
    - install-dependencies
  script:
    - npm run lint
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH

test:unit:
  stage: test
  needs:
    - install-dependencies
  script:
    - npm run test:ci
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    when: always
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH

test:storybook:
  stage: test
  needs:
    - install-dependencies
  before_script:
    - npx playwright install --with-deps chromium
  script:
    - npm run build-storybook
    - npx concurrently -k -s first -n "SB,TEST" "npx http-server storybook-static --port 6006 --silent" "npx wait-on tcp:127.0.0.1:6006 && npx test-storybook --url http://127.0.0.1:6006"
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH

build:library:
  stage: build
  needs:
    - install-dependencies
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_COMMIT_TAG

build:storybook:
  stage: build
  needs:
    - install-dependencies
  script:
    - npm run build-storybook -- --output-dir public
  artifacts:
    paths:
      - public/
    expire_in: 1 week
  rules:
    - if: $CI_COMMIT_BRANCH

pages:
  stage: deploy
  needs:
    - build:storybook
  script:
    - echo "Deploying Storybook to GitLab Pages"
  artifacts:
    paths:
      - public
  environment:
    name: production
    url: $CI_PAGES_URL
  only:
    - main
    - master
```

## Node.js caching strategy for optimal performance

GitLab CI caching requires understanding the **difference between cache and artifacts**. Cache stores dependencies downloaded from the internet (npm packages), while artifacts pass build outputs between pipeline stages.

The optimal strategy caches **the npm cache directory** rather than node_modules. This approach provides 30-50% faster cache restore times because npm's cache contains compressed tarballs instead of thousands of small files. Using package-lock.json as the cache key automatically invalidates the cache when dependencies change, ensuring reproducible builds.

```yaml
cache:
  key:
    files:
      - package-lock.json
    prefix: npm-$CI_COMMIT_REF_SLUG
  fallback_keys:
    - npm-$CI_DEFAULT_BRANCH
    - npm-default
  paths:
    - .npm/
```

The **fallback_keys** provide cache inheritance-feature branches fall back to main branch cache when their specific cache doesn't exist yet. This dramatically improves first-build performance on new branches.

The install-dependencies job uses **pull-push policy** to update the cache, while all other jobs use pull policy for read-only access. This prevents cache thrashing from multiple jobs simultaneously writing the same cache.

## Parallel execution with the needs keyword

The needs keyword enables **parallel job execution**, dramatically reducing pipeline duration. Jobs with identical needs dependencies run simultaneously:

```yaml
lint:eslint:
  needs: [install-dependencies]

lint:prettier:
  needs: [install-dependencies]

test:unit:
  needs: [install-dependencies]

test:storybook:
  needs: [install-dependencies]
```

These four jobs all need only install-dependencies, so they **execute in parallel** rather than sequentially. For a typical component library, this reduces the lint + test stage from 8-10 minutes to 2-3 minutes.

## Running Storybook interaction tests in CI

Storybook's test runner requires **building Storybook**, serving it locally, and then executing tests against the served instance:

```yaml
test:storybook:
  stage: test
  needs:
    - install-dependencies
  before_script:
    - npx playwright install --with-deps chromium
  script:
    - npm run build-storybook
    - npx concurrently -k -s first -n "SB,TEST" "npx http-server storybook-static --port 6006 --silent" "npx wait-on tcp:127.0.0.1:6006 && npx test-storybook --url http://127.0.0.1:6006"
```

The concurrently command **runs two processes simultaneously**: http-server serves the built Storybook, while wait-on waits for the server to become available before running tests. The `-k` flag ensures both processes terminate when tests complete, preventing hanging CI jobs.

## Deploying Storybook to GitLab Pages

GitLab Pages requires specific configuration-the job must be named "pages" or use the `pages: true` keyword, and artifacts must be placed in a directory named "public":

```yaml
build:storybook:
  stage: build
  script:
    - npm run build-storybook -- --output-dir public
  artifacts:
    paths:
      - public/

pages:
  stage: deploy
  needs:
    - build:storybook
  script:
    - echo "Deploying Storybook to GitLab Pages"
  artifacts:
    paths:
      - public
  environment:
    name: production
    url: $CI_PAGES_URL
  only:
    - main
```

The **artifacts inheritance** means the pages job receives the public directory from build:storybook automatically. GitLab Pages deploys the public directory contents to `https://username.gitlab.io/project-name/`.

For project pages (not user/group pages), configure Storybook's base path:

```javascript
// .storybook/main.js
viteFinal: async (config) => {
  const basePath = process.env.CI_PAGES_URL 
    ? new URL(process.env.CI_PAGES_URL).pathname 
    : '/';
  
  config.base = basePath;
  return config;
},
```

This ensures **asset paths resolve correctly** when Storybook deploys to a subdirectory rather than the domain root.

## Optimization strategies for faster pipelines

Modern GitLab CI features enable substantial performance improvements. Setting `FF_USE_FASTZIP` and appropriate `ARTIFACT_COMPRESSION_LEVEL` accelerates artifact handling by 20-30%:

```yaml
variables:
  FF_USE_FASTZIP: "true"
  ARTIFACT_COMPRESSION_LEVEL: "fastest"
```

Using Alpine-based Node images reduces image pull time-node:20-alpine is **60-70% smaller** than node:20. For libraries, Alpine provides all necessary tools while dramatically improving pipeline start time.

Parallel test execution splits large test suites across multiple jobs:

```yaml
test:unit:
  parallel: 4
  script:
    - npm run test -- --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
```

This scales test execution **linearly with parallelism**-four parallel jobs complete a 4-minute test suite in approximately 1 minute.

## Complete GitLab CI best practices summary

Effective CI pipelines combine **strategic caching, intelligent parallelism, and efficient artifact handling**. Cache the npm directory with lock file-based keys and fallback inheritance. Use the needs keyword to enable parallel execution of independent jobs. Set short expiration times for intermediate artifacts like node_modules (1 hour), and longer times for build outputs (1 week).

The resulting pipeline provides **fast feedback loops** for developers-merge requests receive lint and test results within 3-5 minutes, while production deployments complete including Storybook publication in under 10 minutes. This efficiency encourages frequent commits and rapid iteration while maintaining high quality standards.

---

**Previous:** [Enforcing Code Quality and Consistency](./04-code-quality.md)  
**Next:** [Conclusion](./06-conclusion.md)
