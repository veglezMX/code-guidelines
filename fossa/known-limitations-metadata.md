## FOSSA Container Scanning: Known Limitations

I've created a comprehensive document that thoroughly addresses all the questions you outlined about FOSSA container scanning capabilities and limitations. Here's a summary of the key findings:

### Core Docker Image Scanning Capabilities

**Operating System Package Scanning**: FOSSA identifies system-level packages installed via APK, DEB, and RPM package managers, detecting vulnerabilities and license issues in these packages.[1][2][3]

**Supported Base Images**: FOSSA currently supports Alpine, BusyBox, CentOS/RedHat, Debian, Ubuntu, Oracle Linux, Fedora, and Wolfi distributions. However, **scratch images and minimal/distroless images have significant limitations** since they lack package manager metadata that FOSSA relies on.[2][4][3][5]

**Layer Analysis**: FOSSA provides layer differentiation, distinguishing between vulnerabilities in base image layers versus application-specific layers, helping teams prioritize remediation efforts.[2]

**Image Formats**: FOSSA supports both standard Docker images and OCI (Open Container Initiative) formatted images.[6][7]

**Private Registries**: FOSSA can scan images from private registries by leveraging Docker daemon authentication or standard Docker credential helpers.[6]

### Advanced and Edge Case Scenarios

**Multi-Stage Builds**: **Critical limitation** - FOSSA only scans the final runtime image, not intermediate build stages. This means vulnerabilities in builder stages may be missed if they're somehow included in the final binary.[4][8][9]

**Embedded Images**: FOSSA **does not natively support** direct tar archive scanning. Images must be loaded into the Docker daemon first using `docker load`.[10][11]

**Dependencies from Source**: FOSSA has **very limited capability** to detect software compiled and installed from source within Dockerfiles, as it relies on package manager metadata.[12][13]

**Non-OS Packages**: Container scanning has **minimal support** for application-level dependencies (npm, pip, Maven) installed inside containers. The recommendation is to scan source code separately using `fossa analyze` before building containers.[13][14][4]

### Integration, Configuration, and Reporting

**CI/CD Integration**: Container scanning requires a **running Docker daemon**, which is the primary limitation for certain CI/CD platforms. GitHub Actions (Ubuntu runners) and GitLab CI (with Docker-in-Docker) are well-supported.[15][16][6]

**Configuration**: Container scanning is **not automatic** and requires explicit invocation using `fossa container analyze <image-reference>`. The `.fossa.yml` configuration file has limited applicability to container scans.[7][6]

**Reporting**: Findings from container scans are clearly separated from source code vulnerabilities in the FOSSA UI through project-level separation and layer differentiation.[2]

**Performance**: Scan times vary from 30-60 seconds for minimal images to 3-10 minutes for large images with many packages.[17]

### Broader Limitations

**Language Support**: Container scanning **does not replicate** the comprehensive language support of FOSSA's source code analysis. It focuses solely on OS packages.[18][4]

**Transitive Dependencies**: Container scanning reports dependencies as tracked by package managers within the container. For deep dependency analysis, source code scanning is required.[14][19]

**Shift Left Practicality**: Developers can run container scans locally, but the recommended approach is a hybrid model: local source code scans plus CI/CD container scans.[20]

**Feature Maturity**: FOSSA CLI documentation explicitly states that container scanning is **"a work in progress"** with limited support for certain scenarios.[4][2]

### Key Recommendations

1. **Never rely solely on container scanning** - always combine with source code analysis for comprehensive coverage
2. **Use supported base images** (Alpine, Debian, Ubuntu) for best results
3. **Scan all build stages separately** if using multi-stage builds
4. **Implement defense-in-depth** by combining FOSSA with complementary tools like Trivy or Grype
5. **Test thoroughly** with your specific images before relying on container scanning for critical security gates

The document I've created provides extensive detail on each of these areas, including specific examples, workarounds, and best practices for working within FOSSA's current limitations.

[1](https://docs.fossa.com/docs/container-scanning)
[2](https://fossa.com/blog/announcing-fossa-container-scanning/)
[3](https://codesecure.com/our-products/sca-sbom-management/)
[4](https://github.com/fossas/fossa-cli)
[5](https://go1.fossa.com/rs/246-JVA-804/images/FOSSA%20The%20State%20of%20Vulnerabilities%20in%20Linux%20Distributions.pdf)
[6](https://github.com/marketplace/actions/official-fossa-action)
[7](https://github.com/fossas/fossa-action)
[8](https://docs.docker.com/build/building/multi-stage/)
[9](https://docs.docker.com/get-started/docker-concepts/building-images/multi-stage-builds/)
[10](https://github.com/deepfence/SecretScanner/issues/20)
[11](https://gitlab.com/gitlab-org/gitlab/-/issues/390793)
[12](https://www.mend.io/blog/docker-image-security-scanning/)
[13](https://fossa.com/blog/containers-open-source-license-compliance/)
[14](https://fossa.com/blog/direct-dependencies-vs-transitive-dependencies/)
[15](https://fossa.com/resources/guides/gitlab-cicd-setup-and-usage/)
[16](https://fossa.com/resources/guides/github-actions-setup-and-best-practices/)
[17](https://www.reddit.com/r/devops/comments/vdo84n/devopssechow_do_you_manage_container_images/)
[18](https://docs.fossa.com/docs/supported-languages)
[19](https://docs.fossa.com/docs/dependencies-new-ui)
[20](https://spectralops.io/blog/10-free-developer-tools-to-shift-left-security/)
[21](https://fossa.com/blog/container-image-security-vulnerability-scanning/)
[22](https://hub.docker.com/r/fossa/fossa-cli)
[23](https://hub.docker.com/r/docker/fossa-analyzer)
[24](https://help.sonatype.com/en/docker-image-analysis.html)
[25](https://www.wiz.io/academy/docker-container-security-best-practices)
[26](https://www.sysdig.com/learn-cloud-native/12-container-image-scanning-best-practices)
[27](https://docs.digicert.com/nl/software-trust-manager/client-tools/command-line-interface/smctl/manage-scans/scan-software-with-fossa.html)
[28](https://docs.snyk.io/scan-with-snyk/snyk-container/use-snyk-container/detect-the-container-base-image)
[29](https://docs.prismacloud.io/en/compute-edition/32/admin-guide/vulnerability-management/base-images)
[30](https://www.aquasec.com/cloud-native-academy/docker-container/container-image-scanning-tools/)
[31](https://github.com/fossas/meta-fossa)
[32](https://www.reddit.com/r/selfhosted/comments/12mvpq2/open_source_container_scanning_tool_to_find/)
[33](https://www.sciencedirect.com/science/article/pii/S2352711023002728)
[34](https://www.ox.security/blog/software-composition-analysis-and-sca-tools/)
[35](https://www.jit.io/resources/appsec-tools/container-scanning-tools-for-2023)
[36](https://www.redhat.com/en/blog/simple-container-registry)
[37](https://www.youtube.com/watch?v=27Xo4jIi1O0)
[38](https://www.reddit.com/r/docker/comments/b16g3w/using_multistage_builds_to_simplify_build/)
[39](https://docs.openfaas.com/reference/private-registries/)
[40](https://nickjanetakis.com/blog/benchmarking-debian-vs-alpine-as-a-base-docker-image)
[41](https://ona.com/docs/ona/configuration/secrets/container-registry-secret)
[42](https://stackoverflow.com/questions/56654298/using-docker-multistage-build-to-create-multiple-images)
[43](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
[44](https://www.reddit.com/r/docker/comments/77zork/alpine_vs_debianubuntu_securitywise/)
[45](https://www.youtube.com/watch?v=ajetvJmBvFo)
[46](https://docs.fossa.com/docs/javascript)
[47](https://docs.snyk.io/scan-with-snyk/snyk-container/how-snyk-container-works/operating-system-distributions-supported-by-snyk-container)
[48](https://docs.fossa.com/docs/fossa-manual-dependency-types-explained)
[49](https://docs.fossa.com/reference/getpackages)
[50](https://fossa.com/products/scan/)
[51](https://docs.digicert.com/en/software-trust-manager/client-tools/command-line-interface/smctl/manage-scans/scan-software-with-fossa.html)
[52](https://stackoverflow.com/questions/76971922/addressing-critical-vulnerabilities-in-maven-dependencies)
[53](https://codesecure.com/learn/codesecure-and-fossa-partner-to-deliver-single-integrated-platform-for-binary-and-open-source-analysis/)
[54](https://www.reddit.com/r/devops/comments/1k13m0p/how_are_you_catching_sketchy_opensource_packages/)
[55](https://github.com/fossas/fossa-cli/issues)
[56](https://stackoverflow.com/questions/52943829/how-to-check-the-directory-structure-of-a-docker-tar-archive)
[57](https://docs.digicert.com/en/software-trust-manager/threat-detection/software-composition-analysis/perform-software-composition-analysis.html)
[58](https://developer.harness.io/docs/security-testing-orchestration/sto-techref-category/black-duck-hub-scanner-reference/)
[59](https://fossa.com/software-supply-chain-security/)
[60](https://www.aikido.dev/blog/top-open-source-dependency-scanners)
[61](https://developer.harness.io/docs/security-testing-orchestration/sto-techref-category/fossa-scanner-reference)
[62](https://linuxcommandlibrary.com/man/fossa)
[63](https://www.peerspot.com/products/comparisons/fossa_vs_snyk)
[64](https://www.spectrocloud.com/blog/why-continuous-integration-is-nothing-without-continuous-security)
[65](https://docs.fossa.com/docs/using-fossa-compliance)
[66](https://www.oligo.security/academy/container-vulnerability-scanning-technologies-best-practices)
[67](https://www.betsol.com/blog/container-security-scanning-in-the-ci-cd-pipeline/)
[68](https://slashdot.org/software/comparison/FOSSA-vs-RunSafe-Security/)
[69](https://sourceforge.net/software/compare/FOSSA-vs-SonarQube/)
[70](https://pkg.go.dev/github.com/fossas/fossa-cli)
[71](https://github.com/fossas/fossa-cli/issues/354)
[72](https://www.aikido.dev/blog/top-open-source-license-scanners)
[73](https://pmc.ncbi.nlm.nih.gov/articles/PMC10761395/)
[74](https://www.kusari.dev/learninghub/what-is-a-transitive-dependency)
[75](https://pubmed.ncbi.nlm.nih.gov/38377646/)
[76](https://docs.fossa.com/docs/fail-cicd-checks)
[77](https://docs.fossa.com/docs/java)
[78](http://www.diva-portal.org/smash/get/diva2:1463853/FULLTEXT01.pdf)
[79](https://stackoverflow.com/questions/41133455/docker-repository-does-not-have-a-release-file-on-running-apt-get-update-on-ubun)
[80](https://pkg.go.dev/github.com/fossas/fossa-cli/api/fossa)
[81](https://www.sciencedirect.com/science/article/pii/S1090379823001897)
[82](https://stackoverflow.com/questions/66377636/docker-scratch-image-not-showing-up-as-arm64)
[83](https://www.reddit.com/r/docker/comments/1lghnqb/why_arent_fromscratch_images_the_norm/)
[84](https://sylabs.io/2024/07/oci-sif-container-images-unraveling-their-features-and-benefits/)
[85](https://docs.sylabs.io/guides/3.8/user-guide/singularity_and_docker.html)
[86](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/9-0/managing-host-and-cluster-lifecycle/working-with-vsphere-lifecycle-manager-depots/installing-setting-up-and-using-update-manager-download-service/installing-umds-on-linux-os/installing-umds-on-linux-o-0.html)
[87](https://developer.harness.io/docs/security-testing-orchestration/sto-techref-category/security-step-settings-reference/)
[88](https://www.ateam-oracle.com/post/container-security-best-practices-for-cloud-native-application-extensions-on-oci)