## FOSSA Terminology Glossary

This comprehensive glossary covers essential concepts and terms used when working with FOSSA for dependency analysis, license compliance, and vulnerability management.

### Core Concepts

#### Project

A **project** in FOSSA represents a unique codebase or application that you want to analyze for license compliance and security vulnerabilities. It serves as the top-level organizational unit in FOSSA and typically corresponds to a single repository or application. Each project is identified by a name (such as `https://github.com/fossas/fossa-cli` or a custom identifier like `custom+organization/project`).[1][2]

**Key characteristics:**
- Tracks all scans and analyses across multiple versions of your code
- Serves as the container for all revisions
- Maintains project-level settings, policies, and metadata
- Can be associated with repository metadata (GitHub URL, organization, etc.)

#### Revision

A **revision** represents a specific point-in-time snapshot of a project—typically corresponding to a git commit hash or release version. Each time you run `fossa analyze`, FOSSA creates (or updates) a revision with the dependency information discovered at that commit.[3][4][1]

**Key differences from Project:**

| Aspect | Project | Revision |
|--------|---------|----------|
| **Scope** | Entire codebase across all time | Single snapshot at a specific commit |
| **Tracking** | Long-term history | Point-in-time analysis |
| **Example** | `github.com/fossas/fossa-cli` | Revision `09ca72e398bb32747b27c0f43731678fa42c3c26` |
| **Use Case** | Policy enforcement, overall metrics | Comparing changes between commits, CI/CD gates |

You can retrieve all revisions for a project via the `/api/revisions/{locator}` endpoint to see the complete scan history.[3]

#### Locator

A **locator** is FOSSA's unique identifier system for referencing packages, projects, and components throughout the API and platform. It combines three components in a structured format:[5][2][3]

**Locator Structure:**
```
{fetcher}+{project}${revision}
```

**Components:**

1. **Fetcher** - The package manager or source type that identifies where the dependency comes from. Common fetchers include:[4][6][3]
   - `npm` - Node Package Manager (JavaScript/TypeScript)
   - `mvn` - Maven (Java/Scala)
   - `gem` - Ruby Gems
   - `go` - Go modules
   - `pod` - CocoaPods (Objective-C/Swift)
   - `pip` - PyPI (Python)
   - `nuget` - NuGet (.NET/C#)
   - `custom` - Custom or manually uploaded projects

2. **Project** - The package name or project identifier within that ecosystem. Format varies by fetcher:
   - npm: `@scope/package-name` or `package-name`
   - maven: `com.example:artifact-id`
   - nuget: `PackageName`
   - custom: `organization/project-name`

3. **Revision** - The specific version or commit hash identifying which version of the package:[4][3]
   - For packages: `1.2.3` (semantic version) or `3.1.1`
   - For projects: git commit hash like `09ca72e398bb32747b27c0f43731678fa42c3c26`

**Locator Examples:**
- `npm+react$18.2.0` - React npm package version 18.2.0
- `mvn+com.fasterxml.jackson.core:jackson-core$2.2.3` - Jackson Maven dependency
- `custom+github.com/fossas/fossa-cli$09ca72e398bb32747b27c0f43731678fa42c3c26` - Custom project at specific commit
- `nuget+Newtonsoft.Json$13.0.1` - NuGet package[3]

**Why Locators Matter:**
Locators are used extensively in FOSSA APIs to identify exactly which dependency you're querying. For example, to check for issues in a dependency, the API call would be `/api/cli/{locator}/issues`.[7][1]

### Analysis and Scan Concepts

#### Build

A **build** represents the compilation or resolution phase where FOSSA discovers your project's dependencies. The build information includes:[1][4][3]

- Successfully resolved dependencies (list of locators)
- Build artifacts and outputs
- Error context if resolution failed
- Dependency depth information

When you run `fossa analyze`, FOSSA either integrates with your build system (e.g., `dotnet restore`, `npm install`, `mvn dependency:tree`) or performs static analysis to discover dependencies.[8][1]

**Related API endpoint:** `/api/cli/{locator}/latest_build` retrieves the most recent build data for a project.[4][3]

#### Source Unit

A **source unit** is a discrete, analyzable component within a project—typically corresponding to a single module or build target. Examples include:[3][4]

- A single npm package within a monorepo
- An individual Maven module in a multi-module project
- A C# project file (`.csproj`) in a solution
- A Go module within a larger codebase

**Structure:** Each source unit contains:[3]
- **Name** - Identifier for the unit
- **Type** - Build system type (e.g., "go", "maven", "csproj")
- **Manifest** - Path to the manifest file (e.g., "go.mod", "pom.xml", "project.csproj")
- **Build Information** - Resolved dependencies and build context

#### Component

A **component** is a dependency package that FOSSA analyzes—it could be a library, framework, or any external package your project uses. Components are tracked separately from projects to manage third-party risk.[9][4]

Components are typically uploaded as tarballs and analyzed for license compliance and vulnerabilities. The API endpoint `/api/components/signed_url` provides signed URLs for uploading component archives.[3]

#### Dependency

A **dependency** is any external package that your project relies on. FOSSA distinguishes between:[10][1]

- **Direct dependencies** - Packages explicitly listed in your manifest files (e.g., `package.json`, `.csproj`)
- **Transitive dependencies** (or deep dependencies) - Dependencies of your dependencies that are pulled in indirectly
- **Dev dependencies** - Dependencies only used during development (often excluded from production analysis by default)[11]

**Related API endpoint:** `/api/revisions/{locator}/dependencies` retrieves all transitive dependencies for a revision.[4][3]

#### Manifest

A **manifest** is the dependency declaration file specific to each build system. Examples include:[12][1]

- `package.json` (npm)
- `requirements.txt` (pip)
- `go.mod` (Go)
- `pom.xml` (Maven)
- `Gemfile` (Ruby)
- `.csproj` or `packages.config` (NuGet/.NET)[12]

FOSSA automatically detects and parses these manifests to identify dependencies.

### Compliance and Vulnerability Concepts

#### Issue

An **issue** is any detected problem flagged by FOSSA, including license compliance violations or security vulnerabilities. Issues have different types:[13][14]

- **Unlicensed Dependency** - A package with no detected license
- **Policy Flag** - A license that violates your organization's policy
- **License Conflict** - Incompatible licenses detected in dependency tree
- **Vulnerability** - A known security issue (CVE) in a dependency

**Related API endpoint:** `/api/cli/{locator}/issues` retrieves all issues for a specific project revision.[4][3]

#### Policy Flag

A **policy flag** is a specific type of issue raised when a package's license or characteristics don't match your organization's acceptable licensing policy. Unlike violations, policy flags are typically subject to review and approval.[15][14]

**Examples:**
- An uncategorized license that requires manual review
- A permissive license in a context where more restrictive licenses are preferred
- A package flagged for additional scrutiny

#### Reachability

**Reachability** indicates whether a vulnerable code path in a dependency is actually used by your application. FOSSA distinguishes between:[16][17]

- **Course-grained reachability** - Whether a package is imported/used at all (easier to determine but noisier)
- **Fine-grained reachability** - Whether a specific vulnerable function is actually called (more precise but harder to determine)

Understanding reachability helps prioritize which vulnerabilities pose actual risk to your codebase versus those in unused code paths.

#### CVSS Score

**CVSS** (Common Vulnerability Scoring System) is a standardized rating system for vulnerability severity ranging from 0.0 (lowest) to 10.0 (highest). FOSSA uses CVSS scores to help prioritize which vulnerabilities to remediate.[18]

**CVSS Severity Ratings:**
- 0.0 - No Risk
- 0.1-3.9 - Low
- 4.0-6.9 - Medium
- 7.0-8.9 - High
- 9.0-10.0 - Critical[18]

FOSSA prioritization workflows typically recommend focusing first on vulnerabilities with CVSS scores of 7.0 or higher that impact direct dependencies.[18]

#### License

A **license** is the legal terms under which a package can be used, modified, and distributed. FOSSA categorizes licenses as:[19]

- **Permissive** - Minimal restrictions (MIT, Apache 2.0, BSD)
- **Copyleft/Reciprocal** - Require derived works to use the same license (GPL, AGPL)
- **Proprietary/Commercial** - Restrictions on use or modification
- **Unlicensed** - No license detected

#### Scope (Dependency Scope)

**Scope** refers to the context or type of dependency within a project. Different build systems have different scope concepts:[20]

- **Maven Java Scopes:**
  - `compile` - Required for compiling and running
  - `provided` - Provided by the runtime
  - `runtime` - Required only at runtime
  - `test` - Required only for testing[20]

- **General Scopes:**
  - Production dependencies - Used in shipped code
  - Development dependencies - Used during development only

By default, FOSSA often excludes dev dependencies from analysis, though this is configurable.[11]

### Operational Concepts

#### Attribution Report

An **attribution report** (also called a license notice or NOTICE file) is generated documentation listing all dependencies and their associated licenses, formatted for legal compliance and distribution. These reports enable compliance with open source licensing requirements for distribution.[21][22][3]

**Report formats FOSSA supports:** SPDX (JSON/tag-value), CycloneDX (JSON/XML), and custom HTML.[23]

#### SBOM (Software Bill of Materials)

An **SBOM** is a comprehensive list of all components, libraries, and dependencies in your software. FOSSA can both generate SBOMs in standard formats (SPDX, CycloneDX) and import third-party SBOMs for analysis.[24][23]

**Use cases:**
- Supply chain transparency
- Regulatory compliance
- Vulnerability tracking
- Third-party risk management

#### Branch

A **branch** is a git branch identifier associated with a revision, allowing you to track which branch a specific analysis corresponds to. This enables separate tracking of main branch vs. feature branch analyses in FOSSA.[25][26]

#### Label

A **label** is a custom tag or metadata marker applied to packages within a revision scope, useful for filtering, grouping, and policy management. Labels have **revision scope**, meaning they only apply within that specific project revision.[26]

### Configuration Concepts

#### Fetcher

As mentioned in locators, a **fetcher** is FOSSA's abstraction for package managers and repositories. Each fetcher knows how to:[6]

1. Parse the appropriate manifest format
2. Resolve dependencies using that ecosystem's rules
3. Extract package metadata
4. Format locators appropriately

The fetcher concept allows FOSSA to support 20+ languages and build systems through a unified interface.[21][1]

### Example Usage Scenario

Here's how these terms relate in practice:

When you run `fossa analyze` on your C# project:

1. FOSSA identifies the **project** (e.g., `custom+mycompany/myapp`)
2. FOSSA creates a **revision** tagged with the current git commit hash
3. FOSSA finds your `.csproj` and `packages.config` **manifests**
4. FOSSA detects **source units** (individual projects in your solution)
5. FOSSA resolves **direct dependencies** and **transitive dependencies** using the **nuget fetcher**
6. FOSSA creates **locators** for each dependency (e.g., `nuget+Newtonsoft.Json$13.0.1`)
7. FOSSA uploads **build information** containing the dependency graph
8. FOSSA runs policy checks, creating **issues** (policy flags or vulnerabilities)
9. FOSSA calculates **reachability** to determine if vulnerabilities affect your code
10. You generate an **attribution report** for legal compliance

### API Integration Terms

When integrating with FOSSA's API, you'll work with:

- **Endpoint** - API URLs like `/api/revisions/{locator}` that accept locators as parameters
- **Organization** - Your FOSSA account/workspace containing multiple projects
- **API Key** - Authentication credential (stored in `FOSSA_API_KEY` environment variable)

Understanding these terms is essential for working effectively with FOSSA's CLI, web interface, and REST API.[5][4][3]

[1](https://github.com/fossas/fossa-cli)
[2](https://github.com/fossas/locator-rs)
[3](https://pkg.go.dev/github.com/fossas/fossa-cli/api/fossa)
[4](https://pkg.go.dev/github.com/joey-fossa/fossa-cli/api/fossa)
[5](https://docs.fossa.com/docs/introduction-to-the-fossa-api)
[6](https://yarnpkg.com/api/yarnpkg-core/interface/Fetcher)
[7](https://pkg.go.dev/github.com/fossas/fossa-cli/buildtools/maven)
[8](http://www.diva-portal.org/smash/get/diva2:1463853/FULLTEXT01.pdf)
[9](https://docs.fossa.com/reference/build)
[10](https://www.ox.security/blog/software-composition-analysis-and-sca-tools/)
[11](https://docs.fossa.com/docs/javascript)
[12](https://docs.fossa.com/docs/fossabot-supported-ecosystems)
[13](https://docs.fossa.com/docs/issues-api-configuration)
[14](https://www.youtube.com/watch?v=9c0HzwtpUJg)
[15](https://docs.fossa.com/docs/configuring-default-policy-rules)
[16](https://docs.fossa.com/docs/reachability)
[17](https://edgebit.io/blog/code-reachability-security-fixes/)
[18](https://fossa.com/blog/understanding-cvss-common-vulnerability-scoring-system/)
[19](https://fossa.com/glossary/)
[20](https://docs.fossa.com/docs/java)
[21](https://pkg.go.dev/github.com/fossas/fossa-cli)
[22](https://docs.fossa.com/docs/using-fossa-compliance)
[23](https://www.youtube.com/watch?v=o_PjezNUL24)
[24](https://docs.fossa.com/docs/sbom-import)
[25](https://github.com/fossas/fossa-action)
[26](https://docs.fossa.com/docs/using-package-labels)
[27](https://docs.fossa.com/docs/download-fossa-project-attribution-reports)
[28](https://docs.fossa.com/reference/sbomanalysis)
[29](https://www.academyofprosthodontics.org/lib_ap_articles_download/GPT9.pdf)
[30](https://docshield.tungstenautomation.com/TotalAgility/en_US/2025.2-b103T2xQ9l/help/TransformationDesigner/ProjectBuilder/100_UserInterface/LocatorMethods/FormatLocator/r_GeneralTab_FormatLocatorPropertiesWindow.html)
[31](https://github.com/fossas)
[32](https://stackoverflow.com/questions/50640976/how-to-use-localization-with-string-format)
[33](https://docs.fossa.com/reference/getprojectlabels)
[34](https://github.com/orgs/fossas/repositories)
[35](https://www.paloaltonetworks.com/cyberpedia/what-is-sca)
[36](https://docs.fossa.com/docs/dependencies-new-ui)
[37](https://fuchsia.dev/fuchsia-src/concepts/components/v2/component_manifests)
[38](https://docs.flatpak.org/en/latest/manifests.html)
[39](https://www.itbusinessedge.com/it-management/fossa-partners-with-npm-to-discover-javascript-license-dependencies/)
[40](https://docs.fossa.com/docs/configuring-conditional-policy-rules)
[41](https://pkg.go.dev/github.com/kujenga/fossa-cli)
[42](https://www.reddit.com/r/netsec/comments/1j3tvof/case_study_traditional_cvss_scoring_missed_this/)
[43](https://docs.fossa.com/reference/getpackages)
[44](https://docs.fossa.com/docs/package-management)
[45](https://docs.npmjs.com/cli/v9/using-npm/package-spec/)
[46](https://docs.fossa.com/docs/frequently-asked-questions)
[47](https://stackoverflow.com/questions/41003470/npm-install-the-exact-package-version-specified-in-package-json)