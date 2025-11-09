# FOSSA Container Scanning: Known Limitations and Capabilities

## Executive Summary

FOSSA's container scanning functionality is a developing feature designed to identify vulnerabilities and license risks in Docker and OCI container images. While it provides robust coverage for system-level packages, the feature has several important limitations that organizations should understand before integration. This document provides a comprehensive analysis of FOSSA's container scanning capabilities, limitations, and best practices based on current documentation and real-world usage patterns.

**Key Finding**: FOSSA container scanning is explicitly documented as "a work in progress" with limited support for certain use cases, particularly around application-level dependencies, non-standard base images, and complex multi-stage builds.

---

## Core Docker Image Scanning Capabilities

### 1. Operating System Package Scanning

**Capability**: FOSSA identifies and analyzes system-level packages installed via package managers.

**Supported Package Managers**:
- **APK** (Alpine Linux)
- **DEB** (Debian/Ubuntu-based distributions)
- **RPM** (CentOS/RedHat-based distributions)

When a Docker image is scanned using `fossa container analyze`, FOSSA extracts package information from the image layers and identifies:
- Vulnerable packages with associated CVEs
- License information for system packages
- Package versions and origins

**Limitations**:
- Only detects packages installed through recognized package managers
- Cannot identify vulnerabilities in software compiled from source within the Dockerfile
- Limited visibility into packages installed via non-standard methods (e.g., direct binary downloads, manual compilation)

### 2. Supported Base Images

**Currently Supported Linux Distributions**:
- Alpine Linux
- BusyBox
- CentOS/RedHat
- Debian
- Ubuntu
- Oracle Linux
- Fedora
- Wolfi

**Known Limitations with Unsupported Base Images**:

**Scratch Images**: FOSSA has significant limitations when scanning containers built `FROM scratch`. Since scratch images contain only the application binary with no underlying operating system layer:
- No OS packages are detected (by design, none exist)
- FOSSA cannot analyze system-level dependencies
- Only application-level dependencies bundled in the image *may* be detected (see "Non-OS Packages" section below)

**Minimal/Distroless Images**: Google's distroless images and similar minimal base images may have limited support:
- Reduced metadata makes dependency detection more challenging
- Package manager databases may be stripped out, limiting FOSSA's ability to inventory packages
- Some distroless variants may not be recognized as supported distributions

**Custom Base Images**: Organizations using custom-built base images should expect:
- Incomplete scanning results if the base image doesn't match supported distributions
- Potential false negatives for packages not recognized by FOSSA's detection mechanisms

**Recommendation**: Always test FOSSA container scanning against your specific base images during evaluation. For critical workloads using unsupported base images, consider supplementing FOSSA with additional scanning tools.

### 3. Layer Analysis and Differentiation

**Capability**: FOSSA provides layer differentiation in reporting, distinguishing between:
- **Base image layers**: Vulnerabilities inherited from the upstream base image
- **Application layers**: Vulnerabilities introduced in your custom Dockerfile instructions

**Benefits**:
- Teams can prioritize remediation based on whether issues come from base images (upgrade base) or application layers (modify Dockerfile)
- Clearer accountability for security issues
- Better understanding of vulnerability origins

**Limitations**:
- Layer analysis may not always accurately attribute packages when multiple layers modify the same filesystem locations
- Complex layering strategies (e.g., squashed layers) may reduce the granularity of layer attribution
- Intermediate build stages in multi-stage builds may not be fully analyzed (see "Multi-Stage Builds" section)

### 4. Image Formats

**Supported Formats**:
- **Standard Docker images**: Full support for Docker daemon-managed images
- **OCI (Open Container Initiative) formatted images**: FOSSA supports OCI-compliant images, ensuring compatibility with modern container runtimes

**Usage**:
```bash
# Scan a Docker image
fossa container analyze ubuntu:20.04

# Scan an OCI image
fossa container analyze <oci-image-reference>
```

**Limitations**:
- OCI-SIF (Singularity Image Format) and other specialized formats are not mentioned in official documentation
- Proprietary or non-standard image formats may not be supported

### 5. Private Registries

**Authentication Support**: FOSSA can scan images from private container registries, but the process requires proper authentication setup.

**Authentication Methods**:
1. **Docker Daemon Authentication**: If your local Docker daemon is authenticated to the private registry, FOSSA CLI will inherit those credentials
2. **Environment Variables**: Use standard Docker credential helpers or environment variables
3. **Manual Authentication**: Ensure `docker login` is performed before running FOSSA container scans

**Typical Workflow**:
```bash
# Authenticate to private registry
docker login my-registry.company.com

# Scan private image
fossa container analyze my-registry.company.com/namespace/image:tag
```

**Limitations**:
- FOSSA relies on Docker daemon access or pre-authenticated credentials; it does not provide its own credential management system
- In CI/CD environments, you must ensure the build agent has registry credentials configured
- Some registry types (e.g., AWS ECR with short-lived tokens) may require additional scripting to refresh credentials

**Best Practice**: For CI/CD integration, use native registry authentication mechanisms (e.g., AWS IAM roles for ECR, Azure managed identities for ACR) rather than storing long-lived credentials.

---

## Advanced and Edge Case Scenarios

### 1. Multi-Stage Builds

**Current Behavior**: FOSSA container scanning analyzes the **final runtime image only**—not intermediate build stages.

**What This Means**:

Multi-stage Dockerfiles use multiple `FROM` statements. For example:
```dockerfile
# Stage 1: Build stage
FROM maven:3.8-openjdk-11 AS builder
COPY . /app
RUN mvn clean package

# Stage 2: Runtime stage (final image)
FROM openjdk:11-jre-slim
COPY --from=builder /app/target/myapp.jar /app.jar
CMD ["java", "-jar", "/app.jar"]
```

In this scenario:
- FOSSA will **only scan** the `openjdk:11-jre-slim` runtime image
- The `maven:3.8-openjdk-11` builder stage is **not scanned**

**Implications**:

**Risk of Missing Vulnerabilities in Build Dependencies**: If the builder stage contains vulnerable packages that are somehow included in the final image (e.g., through compiled binaries with statically linked libraries), FOSSA may not detect them because it never analyzed the builder stage.

**Example Scenario**: 
- A C/C++ application compiled in a builder stage that statically links a vulnerable OpenSSL version
- The resulting binary is copied to a `scratch` or minimal image
- FOSSA sees the binary but cannot identify the vulnerable OpenSSL version because it wasn't detected in the final image's package manager data

**Mitigation Strategies**:
1. **Scan Builder Images Separately**: Manually scan each intermediate stage as a standalone image
2. **Use Known-Good Base Images**: Ensure builder images come from trusted sources with up-to-date packages
3. **Combine Tools**: Use FOSSA for runtime image scanning and supplement with SAST tools for static binary analysis
4. **Supply Chain Policies**: Enforce policies requiring all base images (including builder images) to pass security scans before use

**Future Considerations**: As FOSSA's container scanning matures, support for analyzing all build stages may be added. Monitor release notes for updates.

### 2. Embedded Images (Tar Archives)

**Question**: Can FOSSA scan a Docker image embedded in a repository as a `.tar` archive?

**Answer**: **Limited Support**. The `fossa container analyze` command is designed to work with:
- Images available in the Docker daemon (via `docker images`)
- Images in remote registries

**Direct `.tar` Archive Scanning**:
Based on analysis of similar tools and FOSSA documentation, FOSSA **does not natively support** directly scanning a `.tar` file without first loading it into the Docker daemon.

**Workaround**:
```bash
# Load the tar archive into Docker daemon
docker load -i image.tar

# Identify the loaded image name/tag
docker images

# Scan the loaded image
fossa container analyze <image-name>:<tag>
```

**Limitations**:
- Requires a running Docker daemon
- Adds operational complexity in CI/CD pipelines
- Tar archive must be in Docker save format (not arbitrary tarballs)

**Alternative Approach**: 
If your CI/CD pipeline produces tar archives of images, consider:
1. Loading the image into the daemon as part of the build process
2. Scanning immediately after load
3. Optionally pushing to a registry for centralized scanning

**Related Tools**: Tools like Trivy and Grype support direct tar archive scanning with `--input` flags, which may be a consideration if this is a critical requirement.

### 3. Dependencies Installed from Source

**Challenge**: Software or libraries compiled and installed from source (rather than via package managers) present significant detection challenges.

**Example Scenario**:
```dockerfile
FROM ubuntu:20.04
RUN apt-get update && apt-get install -y build-essential wget
RUN wget https://example.com/library-1.2.3.tar.gz
RUN tar -xzf library-1.2.3.tar.gz && cd library-1.2.3 && ./configure && make && make install
```

**FOSSA's Capability**: **Very Limited**

FOSSA primarily relies on package manager metadata to identify dependencies. When software is compiled from source:
- No package manager record exists
- Binaries lack clear version metadata
- Dependency relationships are not tracked in a structured format

**What FOSSA Can Detect**:
- Build tools installed via package managers (e.g., `gcc`, `make`)
- System libraries installed as dependencies during the build

**What FOSSA Cannot Detect**:
- The manually compiled library itself
- Vulnerabilities in that library
- License information for source-compiled code

**Mitigation Strategies**:

1. **Use Package Managers When Possible**: Prefer installing software via `apt`, `yum`, or `apk` to ensure visibility
   ```dockerfile
   # Preferred
   RUN apt-get install -y libcurl4-openssl-dev
   
   # Avoid when possible
   RUN wget https://curl.se/download/curl-7.x.tar.gz && tar -xzf ...
   ```

2. **Manual Dependency Declaration**: Use FOSSA's manual dependency features to explicitly declare source-compiled components
   - Create a `.fossa.yml` configuration file
   - Add custom dependencies with known versions

3. **Binary Composition Analysis (BCA)**: For organizations heavily using compiled binaries, consider tools like CodeSecure's CodeSentry that specialize in binary analysis, which FOSSA has partnered with

4. **Standardize Base Images**: Use official base images that pre-install common libraries via package managers

**Future Direction**: FOSSA's partnership with CodeSecure (announced April 2025) aims to address this gap by integrating Binary Composition Analysis capabilities.

### 4. Non-OS Packages (Application-Level Dependencies)

**Question**: Beyond system packages, what support exists for application-level dependencies (npm, pip, Maven, etc.) installed inside containers?

**Current State**: **Limited and Contextual**

FOSSA's container scanning primarily focuses on **system-level packages** (APK, DEB, RPM). Application-level dependency support in container scans is **not equivalent** to FOSSA's source code scanning capabilities.

**What May Be Detected**:

If application dependencies are installed via package managers **and** those package managers leave metadata in the container:
- **Python**: Packages installed via `pip` may be detected if `pip list` or `.egg-info` directories exist
- **Node.js**: npm packages might be detectable if `node_modules` and `package.json` are present
- **Java**: Maven/Gradle dependencies *might* be detected if `.m2` cache or JAR files are present with metadata

**What Is Typically Not Detected**:

- Application dependencies in minimized/distroless images where tooling is stripped
- Dependencies bundled into application JARs/WARs without external metadata
- Application dependencies in `scratch` images (only the final binary exists)

**Best Practice**: **Don't rely on container scanning for application dependencies**

Instead:
1. **Scan Source Code Separately**: Run `fossa analyze` on your application source code **before** building the container
   ```bash
   # In your CI/CD pipeline
   cd /app/source
   fossa analyze  # Scans package.json, requirements.txt, pom.xml, etc.
   
   # Then build container
   docker build -t myapp:latest .
   
   # Scan container for OS packages only
   fossa container analyze myapp:latest
   ```

2. **Combine Scan Results**: Use both source code scans and container scans to get comprehensive coverage
   - Source code scan → Application dependencies (npm, pip, Maven)
   - Container scan → OS packages and base image vulnerabilities

3. **Treat Container Scanning as Supplemental**: Focus container scanning on infrastructure/OS vulnerabilities, not application dependencies

**Why This Matters**:
- Application vulnerabilities are often more critical than OS-level issues
- Relying solely on container scanning will miss most application CVEs
- Proper coverage requires both source and container scanning

---

## Integration, Configuration, and Reporting

### 1. CI/CD Integration

**How Container Scanning Integrates**:

FOSSA container scanning is designed to integrate seamlessly into CI/CD pipelines, similar to source code scanning.

**Requirements**:
- **Running Docker Daemon**: Container scanning requires access to a Docker daemon to inspect images
  - This is the **primary limitation** for certain CI/CD platforms
  - Some CI environments don't provide Docker daemon access by default

**CI/CD Platform Support**:

| Platform | Docker Daemon Support | Configuration |
|----------|----------------------|---------------|
| **GitHub Actions** | ✅ Yes (ubuntu-latest runners) | Daemon available by default |
| **GitLab CI** | ✅ Yes (with Docker-in-Docker service) | Requires DinD service configuration |
| **Jenkins** | ✅ Yes (if Docker installed) | Depends on agent configuration |
| **CircleCI** | ✅ Yes (machine executors) | Not available in Docker executors |
| **Azure DevOps** | ✅ Yes (Ubuntu agents) | Daemon available by default |

**Example: GitHub Actions**
```yaml
jobs:
  fossa-container-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Image
        run: docker build -t myapp:${{ github.sha }} .
      
      - name: Run FOSSA Container Scan
        uses: fossas/fossa-action@main
        with:
          api-key: ${{ secrets.FOSSA_API_KEY }}
          container: myapp:${{ github.sha }}
      
      - name: Run FOSSA Test
        uses: fossas/fossa-action@main
        with:
          api-key: ${{ secrets.FOSSA_API_KEY }}
          container: myapp:${{ github.sha }}
          run-tests: true
```

**Example: GitLab CI with Docker-in-Docker**
```yaml
fossa_container_scan:
  image: docker:latest
  services:
    - docker:dind
  variables:
    DOCKER_HOST: tcp://docker:2375
    DOCKER_TLS_CERTDIR: ""
  script:
    - docker build -t myapp:$CI_COMMIT_SHA .
    - curl -H 'Cache-Control: no-cache' https://raw.githubusercontent.com/fossas/fossa-cli/master/install-latest.sh | bash
    - export FOSSA_API_KEY=$FOSSA_API_KEY
    - fossa container analyze myapp:$CI_COMMIT_SHA
    - fossa container test myapp:$CI_COMMIT_SHA
```

**Limitations in CI/CD**:

1. **MacOS Runners**: GitHub's MacOS runners do not include Docker daemon by default, limiting container scanning capability
2. **Windows Runners**: Limited support; Windows containers are not mentioned in FOSSA documentation
3. **Serverless/Lambda CI**: Environments without Docker daemon (e.g., AWS Lambda-based CI) cannot perform container scanning
4. **Rootless Docker**: Some CI environments use rootless Docker, which may have compatibility issues

**Performance Impact**: See "Performance" section below for scan time considerations.

### 2. Configuration

**Is Container Scanning Automatic?**

**No**, container scanning requires explicit configuration. Unlike source code analysis (`fossa analyze`), which auto-detects project types, container scanning must be invoked with a specific command.

**Command Structure**:
```bash
fossa container analyze <image-reference>
```

**Configuration Options**:

1. **Command-Line Flags**:
   ```bash
   fossa container analyze \
     --project myproject \
     --revision $GIT_SHA \
     --team myteam \
     --fossa-api-key $FOSSA_API_KEY \
     myapp:latest
   ```

2. **Environment Variables**:
   - `FOSSA_API_KEY`: API authentication (required)
   - `FOSSA_ENDPOINT`: Custom FOSSA instance URL (optional)

3. **.fossa.yml Configuration** (Limited for Containers):
   The `.fossa.yml` file is primarily designed for source code analysis. Container-specific settings are **not well documented**, suggesting limited or no support for container scan customization via config file.

**Best Practice**: Use command-line flags or CI/CD pipeline variables for container scan configuration rather than relying on `.fossa.yml`.

**Testing Workflow**:
After analyzing a container, use `fossa container test` to check for policy violations:
```bash
fossa container test myapp:latest
```
This command:
- Exits with status code 0 if no issues found (passes CI)
- Exits with status code 1 if issues detected (fails CI)
- Outputs issue details to stderr

### 3. Reporting

**Question**: In the FOSSA UI, are container scan findings clearly separated from source code vulnerabilities?

**Answer**: **Yes, with caveats**

FOSSA provides differentiation in reporting:

**Project-Level Separation**:
- Container scans typically create separate projects or revisions in the FOSSA UI
- Container images are tracked as distinct entities from source code repositories

**UI Indicators**:
- Projects are labeled with image names/tags
- Layer differentiation shows which vulnerabilities come from base vs. application layers
- Dependency view distinguishes between OS packages and (if detected) application dependencies

**Limitations**:
- If container scans and source code scans use the same project identifier, findings may be merged
- Organizations should establish naming conventions to distinguish container projects from code projects
  - Example: `myapp-source` vs. `myapp-container`

**Report Generation**:
```bash
# Generate attribution report for container
fossa report attribution --project <container-project-id> > container-attribution.txt

# Generate report for source code
fossa report attribution --project <source-project-id> > source-attribution.txt
```

**Best Practice**: 
- Use distinct project names/IDs for container scans vs. source code scans
- Leverage FOSSA's tagging/labeling features to categorize container projects
- Create separate FOSSA policies for container vulnerabilities vs. source code vulnerabilities

### 4. Performance

**Typical Performance Characteristics**:

Container scanning performance varies significantly based on:
- Image size
- Number of layers
- Number of packages installed
- Network speed (for pulling images)
- FOSSA API response times

**Benchmarking Insights**:

| Image Type | Scan Time (Estimate) | Notes |
|------------|---------------------|--------|
| **Minimal images** (Alpine, scratch) | 30-60 seconds | Few packages, fast parsing |
| **Standard images** (Ubuntu, Debian) | 1-3 minutes | Moderate package count |
| **Large images** (with build tools) | 3-10 minutes | Many packages, complex dependencies |
| **Multi-stage final images** | 1-3 minutes | Only final stage scanned |

**Performance Optimization Strategies**:

1. **Minimize Container Image Size**:
   - Use minimal base images (Alpine, distroless)
   - Remove unnecessary packages in Dockerfile
   - Use multi-stage builds to exclude build tools from runtime images

2. **Parallelize Scanning**:
   - In monorepo environments, scan containers in parallel in CI/CD
   - Example (GitHub Actions):
     ```yaml
     strategy:
       matrix:
         image: [frontend, backend, worker]
     ```

3. **Cache Docker Images Locally**:
   - Ensure CI/CD workers cache Docker images to avoid repeated pulls
   - Use layer caching in Docker build steps

4. **Scan Only on Significant Changes**:
   - Skip scans for non-image-affecting commits
   - Example: Only scan when Dockerfile or dependencies change

5. **Incremental Scanning** (Future Feature):
   - FOSSA may introduce caching of previously scanned layers
   - Monitor release notes for this capability

**Very Large Images** (>5GB):
- Scan times can exceed 10-15 minutes
- Consider breaking monolithic images into smaller microservice images
- Evaluate if all packages in the image are necessary

**CI/CD Impact**:
- Budget 2-5 minutes for typical container scans in pipeline duration
- For time-critical deployments, consider parallel scan execution or post-deployment scanning

---

## Broader Limitations and General Queries

### 1. Language and Framework Support Gaps

**FOSSA Source Code Support**: Comprehensive (20+ languages)

FOSSA's source code analysis supports:
- JavaScript/TypeScript (npm, Yarn, pnpm)
- Python (pip, Poetry, Pipenv)
- Java/Scala (Maven, Gradle, SBT)
- Go (Go modules)
- Ruby (Bundler)
- .NET (NuGet)
- Rust (Cargo)
- PHP (Composer)
- And many more...

**FOSSA Container Scanning Support**: Limited to OS Packages

As discussed, container scanning **does not replicate** the deep language support of source code scanning.

**Known Gaps**:

1. **Newer Package Managers**:
   - **pnpm** (JavaScript): May not be fully supported in container contexts
   - **Poetry** (Python): Limited detection in containers
   - **Cargo** (Rust): No specific mention of support in container scanning

2. **Emerging Languages**:
   - **Dart/Flutter**: Not mentioned
   - **Kotlin Native**: Not mentioned
   - **Swift**: Not mentioned for Linux containers

3. **Proprietary/Internal Package Systems**:
   - Custom package managers
   - Internal artifact repositories without standard manifests

**Recommendation**: Always perform source code analysis alongside container scanning to ensure comprehensive coverage.

### 2. Transitive Dependencies Depth

**Question**: How deeply does FOSSA resolve transitive dependencies, and are there limits?

**Source Code Analysis**: Up to 5 levels deep (free tier), unlimited (paid tier)

According to FOSSA documentation:
- **Free tier**: Transitive dependencies up to 5 levels deep
- **Paid tier**: Unlimited depth

**Container Scanning**: Depth depends on package manager metadata

For container scans:
- FOSSA relies on package manager databases within the container
- If the package manager (apt, yum, apk) tracks deep transitive dependencies, FOSSA will report them
- However, container images typically flatten dependencies during installation, so "depth" is less relevant

**Practical Implications**:

- **Source Code**: A JavaScript project with deeply nested `node_modules` may hit depth limits on free tier
- **Container**: An Alpine container with `apk add nginx` will show nginx and all its transitive dependencies as detected by apk, regardless of depth

**Edge Case**: If your container includes application dependencies (e.g., a Python app with `pip install -r requirements.txt`), the depth of those dependencies depends on FOSSA's ability to parse pip metadata within the container—which is limited (see "Non-OS Packages").

**Best Practice**: Don't rely on container scanning for deep dependency graph analysis; use source code scanning for that purpose.

### 3. "Shift Left" Practicality: Local Development Scanning

**Question**: Can developers run FOSSA container scanning on their local machines before committing code?

**Answer**: **Yes, with caveats**

**Local Scanning Workflow**:
```bash
# Developer builds image locally
docker build -t myapp:dev .

# Developer scans locally
export FOSSA_API_KEY=<api-key>
fossa container analyze myapp:dev

# Developer checks for issues
fossa container test myapp:dev
```

**Requirements**:
- FOSSA CLI installed on developer workstation
- Docker daemon running
- FOSSA API key configured
- Network access to FOSSA API (app.fossa.com)

**Practicality Assessment**:

**Pros**:
- Catches container vulnerabilities before CI/CD
- Fast feedback loop for developers
- Reduces CI/CD pipeline failures

**Cons**:
- Requires developers to install and configure FOSSA CLI
- Adds time to local development workflow
- May slow down rapid iteration cycles
- Requires network access (may not work offline)

**Hybrid Approach** (Recommended):
1. **Local**: Run source code scans (`fossa analyze`) locally—fast and detects most critical issues
2. **CI/CD**: Run container scans in CI after image build—centralizes container scanning and avoids burdening developers

**Pre-Commit Hooks**: Organizations can implement pre-commit hooks to remind developers to scan before push, but enforcing container scans locally may be too onerous.

**IDE Integration**: FOSSA does not have native IDE plugins for real-time container scanning (unlike some SAST tools), limiting shift-left potential.

### 4. Feature Maturity and Development Roadmap

**Official Statement**: FOSSA CLI documentation explicitly states:

> "It also has limited support for vendored dependency detection, **container scanning**, and system dependency detection. **These features are still a work in progress.**"

**Current Limitations (Based on "Work in Progress" Status)**:

1. **Incomplete Coverage**: Not all container scenarios are fully tested or supported
2. **Limited Documentation**: Official documentation is sparse compared to source code scanning
3. **Potential Bugs**: Edge cases may produce unexpected results or errors
4. **Evolving APIs**: Container-related APIs and commands may change between versions

**Known Limitations Summary**:

| Feature | Status | Notes |
|---------|--------|-------|
| OS Package Scanning | ✅ Stable | Core functionality, well-supported |
| Base Image Support | ⚠️ Limited | Only specific distros supported |
| Multi-Stage Build Analysis | ❌ Limited | Only final stage scanned |
| Application Dependencies in Containers | ❌ Not Supported | Use source code scans instead |
| Direct Tar Archive Scanning | ❌ Not Supported | Requires loading into Docker daemon |
| Source-Compiled Dependencies | ❌ Not Supported | No detection mechanism |
| Scratch/Distroless Images | ⚠️ Partial | Very limited detection |
| Private Registry Authentication | ✅ Supported | Relies on Docker daemon auth |
| Layer Differentiation | ✅ Supported | Distinguishes base vs. app layers |
| OCI Image Format | ✅ Supported | Standard compliance |

**Development Roadmap** (Speculative based on industry trends):

While FOSSA has not published a detailed roadmap, likely future enhancements include:
- **Expanded base image support**: Adding more minimal/distroless images
- **Improved multi-stage build support**: Scanning all stages, not just final
- **Better application dependency detection**: Leveraging partnerships (e.g., CodeSecure) for binary analysis
- **SBOM integration**: Enhanced import/export of SBOMs for container images
- **Reachability analysis**: Determining if container vulnerabilities are actually exploitable in your runtime context
- **Faster scanning**: Caching and incremental scanning for large images

**Monitoring Updates**: 
- Check FOSSA release notes: https://github.com/fossas/fossa-cli/releases
- Join FOSSA community forums or Slack channels for early access to beta features
- Contact FOSSA support for enterprise roadmap discussions

**Risk Assessment**:
Given the "work in progress" status, organizations should:
- **Test thoroughly** before relying on container scanning for critical security gates
- **Combine with other tools** (e.g., Trivy, Grype, Snyk) for defense-in-depth
- **Provide feedback** to FOSSA when encountering limitations to help prioritize development

---

## Summary and Recommendations

### Quick Reference: FOSSA Container Scanning Capabilities

| Category | Supported | Not Supported / Limited |
|----------|-----------|------------------------|
| **Base Images** | Alpine, Debian, Ubuntu, CentOS, RedHat, BusyBox, Fedora, Oracle Linux, Wolfi | Scratch, distroless (limited), custom images |
| **Package Types** | APK, DEB, RPM | Source-compiled, manually installed binaries |
| **Image Formats** | Docker, OCI | OCI-SIF, proprietary formats |
| **Registries** | Public, private (via Docker auth) | Complex multi-registry setups |
| **Build Stages** | Final runtime stage only | Intermediate build stages |
| **Dependencies** | OS system packages | Application-level deps (npm, pip, Maven) in containers |
| **Scanning Methods** | Docker daemon images, registry images | Direct tar archive scanning |
| **CI/CD** | GitHub Actions, GitLab (DinD), Jenkins, CircleCI (machine), Azure DevOps | Environments without Docker daemon access |
| **Reporting** | Separate container projects, layer differentiation | Limited customization in UI |

### Best Practices for FOSSA Container Scanning

1. **Combine Source and Container Scans**: Never rely solely on container scanning for comprehensive dependency coverage
   
2. **Scan Early and Often**: Integrate container scanning into CI/CD pipelines immediately after image build

3. **Use Supported Base Images**: Stick to well-supported distributions (Alpine, Debian, Ubuntu) for best results

4. **Minimize Container Image Size**: Smaller images scan faster and have smaller attack surfaces

5. **Separate Concerns**: Use distinct FOSSA projects for source code vs. containers for clearer reporting

6. **Test Local Workflows**: Before enforcing container scanning in CI, ensure your specific images produce meaningful results

7. **Supplement with Specialized Tools**: For binary analysis or complex scenarios, consider complementary tools alongside FOSSA

8. **Monitor FOSSA Updates**: As container scanning matures, periodically re-evaluate capabilities and update workflows

### When to Use FOSSA Container Scanning

✅ **Good Fit**:
- Scanning standard Linux distributions (Debian, Ubuntu, Alpine, CentOS)
- Identifying OS-level vulnerabilities in production images
- Tracking base image vulnerabilities separately from application code
- Integrating license compliance checks for OS packages

❌ **Poor Fit**:
- Detecting application-level dependency vulnerabilities (use source code scans)
- Analyzing scratch or heavily minimized images
- Scanning containers with mostly source-compiled software
- Environments without Docker daemon access

### Final Thoughts

FOSSA container scanning is a valuable tool for identifying OS-level vulnerabilities and license issues in container images, particularly when used alongside source code analysis. However, its "work in progress" status means organizations should approach it with realistic expectations and thorough testing.

For comprehensive container security, consider a layered approach:
1. **Source Code Scanning** (FOSSA, Snyk, Veracode): Detect application dependency vulnerabilities
2. **Container Image Scanning** (FOSSA, Trivy, Grype): Detect OS package vulnerabilities
3. **Runtime Security** (Falco, Sysdig): Detect runtime anomalies and exploits
4. **Supply Chain Policies** (FOSSA, Sigstore): Enforce signing and provenance requirements

By understanding FOSSA's container scanning limitations and implementing complementary controls, organizations can build robust container security programs that effectively manage open source risk.

---

## References

- FOSSA CLI GitHub Repository: https://github.com/fossas/fossa-cli
- FOSSA Official Documentation: https://docs.fossa.com
- FOSSA Container Scanning Announcement: https://fossa.com (Blog Archive)
- CodeSecure Partnership Announcement (April 2025)
- Open Source Container Scanning Tools Comparison Studies

---

**Document Version**: 1.0  
**Last Updated**: November 9, 2025  
**Maintained By**: Research Team