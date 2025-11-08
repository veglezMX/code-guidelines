# React Best Practices - Category Framework

## Core Architecture Categories

### 1. Project Structure & Architecture
**Purpose:** Establish scalable, maintainable project organization patterns

- **Folder Architecture Philosophy**
  - Feature-based vs Domain-driven vs Hybrid approaches
  - Colocation principles and boundaries
  - Monorepo considerations and package organization
  
- **Module Organization**
  - Component organization strategies
  - Service layer architecture
  - Shared/common module structure
  - Business logic separation from UI
  
- **Cross-Cutting Concerns**
  - Authentication layer integration
  - Logging infrastructure
  - Feature flagging system
  - Analytics integration patterns
  - Error tracking setup
  
- **Asset Management**
  - Static asset organization (images, fonts, icons)
  - SVG handling strategies
  - Public vs source assets
  - Component-level asset loading (React 19+)
  
- **Routing Architecture**
  - Route definition patterns
  - Route-folder structure alignment
  - Dynamic routing strategies
  - Route guards and protection
  - Code splitting at route level

### 2. Code Standards & Conventions
**Purpose:** Ensure consistent, readable codebase across teams

- **File Naming Standards**
  - Component files (PascalCase)
  - Hook files (camelCase with 'use' prefix)
  - Utility and service files
  - Test file conventions
  - Configuration files
  - Server/Client component suffixes
  
- **Code Naming Conventions**
  - Variable and function naming
  - Boolean prefixes (is, has, should, can, will)
  - Event handler patterns
  - Constants and enums
  - Type/Interface naming
  - Action naming patterns
  
- **Export/Import Patterns**
  - Default vs named exports
  - Barrel exports
  - Import ordering and grouping
  - Absolute vs relative imports
  - Server/Client boundary exports
  
- **Stylistic & Readability Patterns (Un-lintable Conventions)**
  - **Conditional Logic Readability**
    - Prefer if/else over nested ternaries
    - Early returns for guard clauses
    - Maximum ternary complexity limits
  - **Magic Values Prevention**
    - Named constants for all literals
    - Centralized configuration objects
    - Semantic constant naming
  - **Abstraction Timing (Rule of Three)**
    - First instance: write inline
    - Second instance: copy-paste
    - Third instance: create abstraction
    - Avoid premature optimization
  - **Component Responsibility Boundaries**
    - Single responsibility principle
    - Maximum 150 lines of JSX guideline
    - Maximum 5 useState hooks per component
    - Maximum 10 props threshold
  - **Code Organization Within Files**
    - Logical grouping of related code
    - Consistent ordering of hooks
    - Helper functions placement
  - **Comment Quality Standards**
    - Why over what in comments
    - Business logic documentation
    - Complex algorithm explanations
    - TODO format and tracking
  - **Array/Object Manipulation**
    - Prefer declarative over imperative
    - Immutability patterns
    - Chaining readability limits
  - **Async Code Patterns**
    - Consistent error handling
    - Loading state management
    - Promise vs async/await usage
  - **Component Composition**
    - Prop spreading guidelines
    - Children vs render props decisions
    - Component depth limits

### 3. Component Design Patterns
**Purpose:** Standardize component creation and composition

- **Component Structure**
  - Function declaration vs arrow functions
  - File organization within components
  - Component lifecycle patterns
  - Server vs Client components decision tree
  
- **Props & State Management**
  - Props definition (type vs interface)
  - Props destructuring patterns
  - State initialization patterns
  - Derived state handling
  - Props drilling vs composition
  
- **Advanced Patterns**
  - Compound components
  - Render props
  - Higher-Order Components (HOCs)
  - Custom hooks composition
  - Controlled vs uncontrolled components
  - Provider patterns
  
- **Hooks Best Practices**
  - Standard hooks usage (useState, useEffect, etc.)
  - Dependency array management
  - Custom hook patterns
  - Hook composition strategies
  - Rules of hooks enforcement
  
- **React 19+ Patterns**
  - **Server vs Client Components**
    - Decision criteria for `"use server"` vs `"use client"`
    - Data fetching patterns in Server Components
    - Component composition across boundaries
    - Streaming and Suspense integration
  - **Action-based Patterns**
    - Form actions and mutations
    - `useTransition` for pending states
    - `useOptimistic` for optimistic UI
    - `useFormStatus` for form feedback
    - Server actions best practices
  - **Asset Loading Optimization**
    - Component-level `<link>` and `<style>` usage
    - Resource hints and preloading
    - Critical CSS strategies

## State & Data Management

### 4. State Management Strategy
**Purpose:** Define clear state management hierarchy and patterns

- **State Hierarchy**
  - Local component state criteria
  - Lifted state patterns
  - Global state requirements
  - **Server State vs Client State (Expanded)**
    - User preferences → Client state (global store)
    - API data → Server state (TanStack Query/SWR)
    - Form data → Local state or form library
    - UI state → Local or lifted state
    - Session data → Secure client state
  
- **Global State Solutions**
  - Library selection (Redux Toolkit, Zustand, Context API)
  - Store structure and organization
  - Action/Reducer patterns
  - Selector optimization
  - State persistence strategies
  
- **State Normalization**
  - Data structure patterns
  - Relationship management
  - Update strategies
  - Cache invalidation

### 5. API Integration & Data Fetching
**Purpose:** Standardize external data interaction

- **Data Fetching Strategy**
  - Library selection (TanStack Query, SWR, RTK Query)
  - Custom hook patterns for API calls
  - Caching strategies
  - Server Components data fetching
  
- **API Layer Design**
  - Service layer architecture
  - HTTP client configuration
  - Request/Response interceptors
  - Error handling patterns
  - Retry logic and backoff strategies
  
- **Advanced Patterns**
  - Optimistic updates
  - Pagination and infinite scrolling
  - Real-time data (WebSockets, SSE)
  - File upload handling
  - Parallel vs Sequential requests
  - Request deduplication

## Quality Assurance

### 6. Testing Strategy
**Purpose:** Ensure code reliability and maintainability

- **Testing Pyramid**
  - Unit testing approach
  - Integration testing patterns
  - End-to-end testing strategy
  - Visual regression testing
  - Performance testing
  
- **Testing Implementation**
  - Test structure and naming
  - Mocking strategies
  - Coverage requirements
  - Server Component testing
  - Client Component testing
  - Hook testing patterns
  
- **Testing Tools**
  - Test runner configuration
  - Assertion libraries
  - Mock service workers
  - Accessibility testing
  - Testing library best practices

### 7. Code Quality & Tooling
**Purpose:** Automate quality checks and formatting

- **Linting Configuration**
  - ESLint rules and plugins
  - TypeScript strictness levels
  - Custom rule definitions
  - React 19 specific rules
  
- **Formatting Standards**
  - Prettier configuration
  - EditorConfig setup
  - Import sorting
  - File organization rules
  
- **Type Safety**
  - TypeScript configuration
  - Strict mode settings
  - Type generation from APIs
  - Runtime type validation
  
- **Automation**
  - Pre-commit hooks
  - CI/CD integration
  - Automated dependency updates
  - Code review automation

## User Experience & Performance

### 8. Performance Optimization
**Purpose:** Ensure optimal application performance

- **Rendering Optimization**
  - Memoization strategies (React.memo, useMemo, useCallback)
  - Re-render prevention patterns
  - Component splitting strategies
  - Server Component optimization
  
- **Loading Performance**
  - Code splitting and lazy loading
  - Bundle optimization
  - Asset optimization
  - Critical rendering path
  - Progressive enhancement
  
- **Perceived Performance**
  - Skeleton screens
  - Progressive loading patterns
  - Meaningful loading indicators
  - Optimistic UI updates
  - Instant interactions
  - Prefetching strategies
  
- **Runtime Performance**
  - List virtualization
  - Image lazy loading
  - Web Workers usage
  - Performance monitoring
  - Memory leak prevention
  
- **Performance Budgets**
  - **Core Web Vitals Targets**
    - LCP: < 2.5s (good), < 4s (needs improvement)
    - INP: < 200ms (good), < 500ms (needs improvement)
    - CLS: < 0.1 (good), < 0.25 (needs improvement)
    - FCP: < 1.8s (good), < 3s (needs improvement)
    - TTFB: < 800ms (good), < 1800ms (needs improvement)
  - **Bundle Size Limits**
    - Initial JS: < 200KB (gzipped)
    - Initial CSS: < 50KB (gzipped)
    - Per-route chunks: < 100KB
    - Total size: < 1MB (all assets)
  - **Asset Optimization Rules**
    - Images: Max 200KB per image, WebP/AVIF preferred
    - Fonts: < 100KB per font file, subset when possible
    - Videos: Lazy load, max 5MB initial load
  - **Runtime Metrics**
    - Long task threshold: 50ms
    - Total blocking time: < 300ms
    - Memory usage limits
    - API response time targets

### 9. Styling & Design System
**Purpose:** Maintain consistent visual design and component library

- **Styling Approach**
  - CSS-in-JS vs CSS Modules vs Utility-first
  - Style organization patterns
  - Component styling patterns
  - Server Component styling considerations
  
- **Design Tokens**
  - **Token Management**
    - Source of truth (Figma/Style Dictionary)
    - Token naming conventions
    - Token categories (color, spacing, typography)
    - Token versioning
  - **Token Implementation**
    - CSS custom properties
    - JS token objects
    - Token transformation pipeline
    - Platform-specific exports
  
- **Component Library Governance**
  - **Maturity Levels**
    - Draft: Experimental, may change
    - Beta: API stabilizing, testing in production
    - Stable: Production-ready, documented
    - Deprecated: Scheduled for removal
  - **Promotion Criteria**
    - Accessibility audit passed
    - Visual regression tests
    - Documentation complete
    - Design review approved
    - Performance benchmarked
  
- **Theme System**
  - Theme structure and switching
  - Dark mode implementation
  - High contrast mode
  - Custom theme creation
  - Theme inheritance patterns
  
- **Visual Testing**
  - **Visual Review Workflow**
    - Storybook stories required
    - Chromatic/Percy integration
    - Screenshot diff thresholds
    - Approval process
  - **Responsive Testing**
    - Breakpoint definitions
    - Device testing matrix
    - Orientation handling
  
- **Animation & Motion**
  - Animation principles
  - Performance budgets
  - Reduced motion support
  - Transition timing standards
  - Gesture libraries

### 10. Forms & User Input
**Purpose:** Standardize form handling and validation

- **Form Management**
  - Library selection (React Hook Form, Formik)
  - Form state patterns
  - Multi-step forms
  - Server Actions integration
  
- **Validation**
  - Client-side validation
  - Schema validation (Zod, Yup)
  - Async validation
  - Server-side validation
  - Error display patterns
  
- **Advanced Patterns**
  - File uploads
  - Dynamic forms
  - Form persistence
  - Accessibility considerations

## Accessibility & Internationalization

### 11. Accessibility (a11y)
**Purpose:** Ensure inclusive user experience

- **Core Principles**
  - Semantic HTML usage
  - ARIA attributes
  - Keyboard navigation
  - Screen reader support
  - Focus management
  
- **Implementation**
  - Color contrast requirements
  - Form accessibility
  - Error announcements
  - Skip links
  - Landmark regions
  
- **Testing & Tools**
  - Automated a11y testing
  - Manual testing guidelines
  - Accessibility audit process
  - Screen reader testing
  - Keyboard testing protocols
  
- **Accessibility Standards & Targets**
  - **WCAG Compliance Level**
    - Target: WCAG 2.2 Level AA
    - Critical pages: WCAG 2.2 Level AAA
  - **Automated Testing Gates**
    - axe-core violations: 0 errors allowed
    - Color contrast: 4.5:1 minimum (7:1 for AAA)
    - Focus indicators: Visible on all interactive elements
  - **Keyboard Navigation Requirements**
    - Tab order: Logical and tested
    - Skip links: Present on all pages
    - Keyboard traps: None allowed
    - Focus management: Explicit after route changes
  - **Screen Reader Support**
    - NVDA/JAWS: Full compatibility
    - VoiceOver: iOS/macOS tested
    - Live regions: Properly announced
  - **Performance Targets**
    - Focus response: < 100ms
    - Screen reader announcement: < 1s

### 12. Internationalization (i18n)
**Purpose:** Support global user base

- **Localization Strategy**
  - Library selection (react-i18next, FormatJS)
  - Translation file structure
  - Key naming conventions
  - Server Component i18n
  
- **Implementation**
  - Date/time formatting
  - Number/currency formatting
  - RTL support
  - Dynamic language switching
  - Locale-specific assets

## Security & Error Management

### 13. Security Best Practices
**Purpose:** Protect application and user data

- **Client-Side Security**
  - XSS prevention strategies
  - CSRF protection implementation
  - Input sanitization rules
  - Output encoding standards
  - Secure communication (HTTPS only)
  
- **Content Security Policy**
  - CSP baseline configuration
  - Trusted domains allowlist
  - Inline script policies
  - Subresource Integrity (SRI)
  - Report-only vs Enforcement mode
  
- **Authentication & Authorization**
  - JWT handling and storage
  - Token refresh patterns
  - Client-side route protection
  - Role-based access control (RBAC)
  - Session management
  - OAuth integration patterns
  
- **Data Protection**
  - **PII Handling Matrix**
    - What can enter logs: User ID, Session ID
    - What must be masked: Email (partial), Phone, SSN
    - What's forbidden: Passwords, Credit cards, Health data
  - **Client Storage Rules**
    - localStorage: Non-sensitive preferences only
    - sessionStorage: Temporary UI state
    - Cookies: HttpOnly, Secure, SameSite
    - IndexedDB: Encrypted if sensitive
  - **API Security**
    - Never store API keys in client
    - Environment variable policies
    - Proxy sensitive requests through BFF
  
- **React-Specific Security**
  - **Server Components/Actions**
    - Boundary security checks
    - Input validation in actions
    - Authorization in server components
    - Rate limiting implementation
  - **RSC Threat Model**
    - Data exposure risks
    - Action replay attacks
    - CSRF in Server Actions
  
- **Dependency Security**
  - Vulnerability scanning schedule
  - Update policies by severity
  - License compliance checks
  - Supply chain security
  - Lock file integrity

### 14. Error Handling & Observability
**Purpose:** Comprehensive monitoring, debugging, and error management

- **Error Boundaries**
  - Implementation patterns
  - Fallback UI strategies
  - Error recovery
  - Server Component error handling
  
- **Error Taxonomy**
  - **Error Classification**
    - Recoverable vs Fatal errors
    - User-visible vs Silent failures
    - Network vs Application errors
    - Validation vs System errors
  - **Error Handling Matrix**
    - Per error type: Log level, User feedback, Recovery action
    - Correlation ID generation
    - Error context preservation
  
- **Logging & Monitoring**
  - **Frontend Logging Standards**
    - Log levels: ERROR, WARN, INFO, DEBUG
    - Structured logging format
    - PII redaction rules
    - Sampling rates by environment
  - **Error Tracking**
    - Sentry/Rollbar integration
    - Source map configuration
    - Error grouping rules
    - Alert thresholds
  
- **Telemetry & Analytics**
  - **Event Schema**
    - Event naming conventions (noun_verb)
    - Required properties per event type
    - PII compliance matrix
    - Event validation rules
  - **Required Events**
    - Page views with metadata
    - User interactions (clicks, forms)
    - Performance marks
    - Error occurrences
  - **Custom Metrics**
    - Business KPIs
    - User engagement metrics
    - Feature adoption tracking
  
- **Performance Observability**
  - **Real User Monitoring (RUM)**
    - Core Web Vitals collection
    - Custom performance marks
    - User timing API usage
    - Long task monitoring (> 50ms)
  - **Synthetic Monitoring**
    - Critical user journey tests
    - API endpoint monitoring
    - Availability checks
  - **Performance Tracing**
    - Distributed tracing setup
    - Span naming conventions
    - Critical path identification
  
- **User Feedback Patterns**
  - Error message guidelines
  - Loading state standards
  - Empty state patterns
  - Offline handling
  - Retry mechanisms

## Documentation & Development Experience

### 15. Documentation Standards
**Purpose:** Maintain comprehensive project knowledge

- **Code Documentation**
  - Component documentation
  - API documentation
  - Complex logic documentation
  - JSDoc/TSDoc standards
  - Inline comments best practices
  
- **Project Documentation**
  - README structure
  - Architecture Decision Records (ADRs)
  - Contributing guidelines
  - Changelog maintenance
  - Deployment guides
  
- **Living Documentation**
  - Storybook integration
  - Component libraries
  - API documentation tools
  - Interactive examples

### 16. Developer Experience & Tooling
**Purpose:** Optimize team productivity and satisfaction

- **Development Environment**
  - Standardized local setup
  - Docker configuration
  - Environment variables management
  - VS Code settings and extensions
  - Browser extensions
  
- **IDE Integration**
  - Recommended extensions
  - Workspace settings
  - Snippets and templates
  - Debugging configurations
  - Task automation
  
- **Debugging & Diagnostics**
  - React DevTools best practices
  - Console logging guidelines
  - Network debugging
  - Performance profiling
  - Memory leak detection
  
- **Component Development Workflow**
  - Storybook setup and patterns
  - Story writing guidelines
  - Visual testing integration
  - Design system synchronization
  - Hot module replacement optimization

### 17. Build & Deployment
**Purpose:** Streamline delivery pipeline

- **Build Configuration**
  - Build tool selection (Vite, Next.js, Remix)
  - Environment configuration
  - Build optimization
  - Bundle analysis
  
- **CI/CD Pipeline**
  - Pipeline stages
  - Automated testing
  - Deployment strategies
  - Preview deployments
  - Rollback procedures
  
- **Monitoring & Maintenance**
  - Application monitoring
  - Performance tracking
  - Error tracking
  - User feedback loops
  - A/B testing infrastructure

### 18. Versioning & Release Management
**Purpose:** Maintain consistent versioning and deployment processes

- **Branching Strategy**
  - Branching model (Trunk-based vs GitFlow)
  - Merge policies and requirements
  - Branch protection rules
  - Hotfix procedures
  
- **Commit Standards**
  - Conventional Commits specification
  - Commit message templates
  - Breaking change documentation
  - Changesets configuration
  
- **Semantic Versioning**
  - Version bump rules by commit type
  - Pre-release versioning
  - Tag naming conventions
  - Version documentation
  
- **Release Process**
  - Release trains vs on-demand
  - Canary deployments
  - Feature toggles & kill switches
  - Rollback strategies
  - Release notes automation
  
- **Feature Management**
  - Feature flag implementation
  - Progressive rollout strategies
  - A/B testing integration
  - Kill switch procedures

## Team & Process

### 18. Team Collaboration
**Purpose:** Facilitate effective team development

- **Code Review Standards**
  - Review checklist
  - PR templates
  - Review process
  - Automated checks
  
- **Knowledge Sharing**
  - Documentation practices
  - Onboarding guides
  - Best practices updates
  - Tech talks and demos
  - Pair programming guidelines

### 19. Governance & Decision Policy
**Purpose:** Establish clear ownership and decision-making processes

- **Definition of Ready/Done**
  - Component completion checklist
  - Hook readiness criteria
  - Page/feature done definition
  - Documentation requirements
  - Test coverage thresholds
  
- **Code Ownership**
  - CODEOWNERS file maintenance
  - Reviewer rotation policy
  - PR review SLAs (e.g., 24hr for critical, 48hr standard)
  - Escalation paths
  
- **Architecture Decisions**
  - ADR approval process (who, how many approvals)
  - Review cadence and expiry windows
  - Decision reversal procedures
  - Stakeholder involvement matrix
  
- **Deprecation & Migration**
  - Deprecation playbook (flags → warnings → removal)
  - Migration timelines and phases
  - Breaking change communication
  - Backwards compatibility requirements
  - Feature sunset procedures
  
- **Browser & Device Support**
  - Explicit browser support matrix
  - Mobile device requirements
  - Progressive enhancement strategy
  - Fallback implementation requirements
  - Testing matrix

### 20. Technical Debt Management
**Purpose:** Maintain long-term code health

- **Refactoring Strategy**
  - Identification process
  - Prioritization framework
  - Migration patterns
  - Incremental improvements
  
- **Modernization**
  - Dependency updates
  - Pattern migration
  - Performance improvements
  - React version upgrades
  - Legacy code handling

## Implementation Patterns

### 21. Golden Paths (Opinionated Recipes)
**Purpose:** Provide battle-tested solutions for common scenarios

- **Data Fetching Patterns**
  - **Decision Matrix**
    - Static data → Server Components
    - User-specific → Client query with cache
    - Real-time → WebSocket/SSE
    - Forms → Server Actions
  - **Implementation Templates**
    - RSC data fetching pattern
    - TanStack Query setup
    - Optimistic updates recipe
    - Infinite scroll implementation
  
- **Form Handling Recipes**
  - **Form Type Decision Tree**
    - Simple forms → Server Actions
    - Complex validation → React Hook Form
    - Multi-step → State machine
    - File uploads → Progressive enhancement
  - **Standard Patterns**
    - Validation with Zod/Yup
    - Error handling template
    - Optimistic submission
    - Progress indicators
  
- **List & Table Patterns**
  - Virtualized lists (> 100 items)
  - Pagination vs Infinite scroll decision
  - Sorting & filtering implementation
  - Selection patterns (single/multi)
  - Skeleton loading templates
  
- **File Upload Recipes**
  - Accepted formats validation
  - Size limits (client & server)
  - Progress tracking
  - Resumable uploads
  - Virus scanning integration
  - Drag & drop implementation
  
- **Authentication Flows**
  - JWT implementation template
  - OAuth integration pattern
  - Session management
  - Protected route wrapper
  - Refresh token handling
  
- **Search Implementation**
  - Instant search with debouncing
  - Search-as-you-type
  - Faceted search
  - Search history
  - Fuzzy matching

### 22. Content & UX Writing
**Purpose:** Maintain consistent user communication

- **Microcopy Style Guide**
  - Tone of voice guidelines
  - Capitalization rules (sentence case vs title case)
  - Button text patterns
  - Link text standards
  - Placeholder text guidelines
  
- **Message Patterns**
  - **Error Messages**
    - Structure: What happened + Why + How to fix
    - Tone: Helpful, not blaming
    - Examples catalog by error type
  - **Loading Messages**
    - Progressive disclosure
    - Time estimates when possible
    - Skeleton text standards
  - **Empty States**
    - First-time vs no-results
    - Actionable suggestions
    - Illustration usage
  - **Success Messages**
    - Confirmation patterns
    - Next steps guidance
  
- **Internationalization Content**
  - Variable placeholder syntax
  - Punctuation mirroring rules
  - RTL content considerations
  - Date/time format standards
  - Number formatting rules
  
- **Accessibility Content**
  - Alt text guidelines
  - ARIA label standards
  - Screen reader announcements
  - Error message formatting

### 23. Offline & Resilience
**Purpose:** Ensure application reliability under poor conditions

- **Offline Strategy**
  - **Offline Requirements Matrix**
    - Must work offline (critical features)
    - Should cache (nice-to-have)
    - Online-only (real-time features)
  - **Cache Strategy**
    - Cache-first vs Network-first decisions
    - Stale-while-revalidate windows
    - Cache invalidation rules
  
- **PWA Implementation**
  - Service Worker setup
  - Manifest configuration
  - Install prompts
  - Update notifications
  - Background sync
  
- **Network Resilience**
  - Retry strategies (exponential backoff)
  - Timeout configurations
  - Request prioritization
  - Bandwidth detection
  - Connection state handling
  
- **Failure UX Patterns**
  - Toast vs inline errors decision
  - Retry affordances
  - Offline indicators
  - Queue visualization
  - Conflict resolution UI

### 24. Scaffolding & Automation
**Purpose:** Accelerate development through automation

- **Code Generation**
  - **Generator Templates**
    - Component generator (with tests, stories)
    - Hook generator (with tests)
    - Page/Route generator
    - API endpoint generator
    - i18n key generator
  - **Tools Configuration**
    - Plop templates
    - Nx generators
    - Custom CLI tools
  
- **Custom Linting Rules**
  - Encoding "un-lintables" in ESLint
  - Component size limits
  - Import restrictions
  - Naming pattern enforcement
  - Deprecation warnings
  
- **Pre-commit Automation**
  - **Required Checks**
    - Lint (ESLint + Prettier)
    - Type checking (tsc)
    - Unit tests (affected only)
    - Bundle size check
    - Basic a11y scan
  - **Optional Checks**
    - Visual regression
    - License scan
    - Security audit
  
- **Development Automation**
  - Auto-imports configuration
  - Snippet libraries
  - Live templates
  - Debugging presets
  - Environment setup scripts

---

## Category Priority Matrix

### 🔴 Critical (Must Have - Week 1-2)
1. Project Structure & Architecture
2. Code Standards & Conventions
3. Component Design Patterns (including React 19+)
4. State Management Strategy
5. Security Best Practices
6. Error Handling & Observability
7. Governance & Decision Policy
8. Golden Paths (Core Patterns)

### 🟡 Important (Should Have - Weeks 3-4)
9. API Integration & Data Fetching
10. Testing Strategy
11. Code Quality & Tooling
12. Performance Optimization (with Budgets)
13. Accessibility (with Targets)
14. Documentation Standards
15. Developer Experience & Tooling
16. Versioning & Release Management

### 🟢 Beneficial (Nice to Have - Weeks 5-6)
17. Styling & Design System
18. Forms & User Input
19. Internationalization
20. Build & Deployment
21. Team Collaboration
22. Content & UX Writing
23. Offline & Resilience
24. Scaffolding & Automation
25. Technical Debt Management

---


## Success Metrics

### Technical Metrics
- Performance budget compliance: > 95%
- Accessibility violations: 0
- Test coverage: > 80%
- Build time: < 5 minutes
- Bundle size target achievement: 100%

### Process Metrics
- PR review time: < 24 hours
- ADR compliance: 100% for major decisions
- Onboarding time: < 1 week
- Code review rework rate: < 20%

### Quality Metrics
- Production incidents: < 2/month
- User-reported bugs: < 5/sprint
- Tech debt ratio: < 20%
- Component reuse rate: > 60%

---

## Decision Framework

For each category, teams should document decisions in ADRs covering:

1. **Context**: Why this decision is needed
2. **Decision**: What approach was chosen
3. **Consequences**: Trade-offs and impacts
4. **Alternatives**: Other options considered
5. **Review Date**: When to revisit

This ensures long-term maintainability and knowledge transfer.

---

## Un-lintable Convention Examples

These human-centric guidelines bridge the gap between syntactically correct code and truly maintainable code. While tools like ESLint and Prettier handle formatting, these patterns require developer judgment.

### Conditional Logic Readability

**Rule:** Prefer if/else statements over complex or nested ternaries. Simple, single-line ternaries for assignments are acceptable.

```javascript
// ❌ AVOID - Hard to read and debug
const Component = ({ user, isLoading }) => {
  return isLoading 
    ? <Spinner /> 
    : user 
      ? user.isAdmin 
        ? <AdminDashboard user={user} /> 
        : <UserProfile user={user} /> 
      : <LoginButton />;
}

// ✅ PREFER - Clear separation of concerns
const Component = ({ user, isLoading }) => {
  if (isLoading) {
    return <Spinner />;
  }

  if (!user) {
    return <LoginButton />;
  }

  return user.isAdmin 
    ? <AdminDashboard user={user} />
    : <UserProfile user={user} />;
}
```

### Avoiding Magic Values

**Rule:** Extract all hardcoded strings and numbers into named constants with clear semantic meaning.

```javascript
// ❌ AVOID - Unclear intent
function UserStatus({ status }) {
  if (status === 2) {
    return <span style={{ color: '#28a745' }}>Active</span>;
  }
}

// ✅ PREFER - Self-documenting
const USER_STATUS = {
  INACTIVE: 1,
  ACTIVE: 2,
  SUSPENDED: 3
} as const;

const COLORS = {
  SUCCESS: '#28a745',
  WARNING: '#ffc107',
  DANGER: '#dc3545'
} as const;

function UserStatus({ status }) {
  if (status === USER_STATUS.ACTIVE) {
    return <span style={{ color: COLORS.SUCCESS }}>Active</span>;
  }
}
```

### Rule of Three for Abstraction

**Rule:** Create abstractions only after the third instance of similar code. This prevents premature optimization.

```javascript
// First instance: Write inline
<button className="px-4 py-2 bg-blue-500 text-white rounded">
  Save
</button>

// Second instance: Copy-paste is OK
<button className="px-4 py-2 bg-blue-500 text-white rounded">
  Submit
</button>

// Third instance: NOW create the abstraction
function PrimaryButton({ children, onClick }) {
  return (
    <button 
      className="px-4 py-2 bg-blue-500 text-white rounded"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Component Responsibility Boundaries

**Rule:** Components should have a single, clear responsibility. Consider refactoring when exceeding these thresholds:
- 150+ lines of JSX
- 5+ useState hooks
- 10+ props

```javascript
// ❌ AVOID - God component with too many responsibilities
function UserSettingsPage() {
  const [profile, setProfile] = useState({});
  const [password, setPassword] = useState('');
  const [notifications, setNotifications] = useState({});
  const [theme, setTheme] = useState('light');
  const [privacy, setPrivacy] = useState({});
  const [billing, setBilling] = useState({});
  // ... 200+ lines of mixed logic and JSX
}

// ✅ PREFER - Separated by concern
function UserSettingsPage() {
  const { user, isLoading } = useUserData();
  
  if (isLoading) return <SettingsSkeleton />;

  return (
    <SettingsLayout>
      <ProfileSection user={user} />
      <SecuritySection userId={user.id} />
      <PreferencesSection settings={user.settings} />
      <BillingSection subscription={user.subscription} />
    </SettingsLayout>
  );
}
```

### Array/Object Manipulation Patterns

**Rule:** Prefer declarative, immutable patterns over imperative mutations.

```javascript
// ❌ AVOID - Imperative and mutating
const processUsers = (users) => {
  const result = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].isActive) {
      users[i].lastSeen = new Date();
      result.push(users[i]);
    }
  }
  return result;
}

// ✅ PREFER - Declarative and immutable
const processUsers = (users) => {
  return users
    .filter(user => user.isActive)
    .map(user => ({
      ...user,
      lastSeen: new Date()
    }));
}
```

### Async Code Consistency

**Rule:** Use consistent patterns for async operations throughout the codebase.

```javascript
// ❌ AVOID - Mixed patterns
function Component() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData)
      .catch(err => console.log(err)); // Inconsistent error handling
  }, []);

  const handleSubmit = async () => {
    try {
      await saveData(); // Different pattern
    } catch (e) {
      alert(e.message); // Different error handling
    }
  };
}

// ✅ PREFER - Consistent async/await with unified error handling
function Component() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err);
        logError(err); // Centralized error handling
      }
    };
    
    fetchData();
  }, []);

  const handleSubmit = async () => {
    try {
      await saveData();
    } catch (err) {
      setError(err);
      logError(err); // Same error handling pattern
    }
  };
}
```

### Comment Quality Standards

**Rule:** Comments should explain "why" not "what". Document business logic, not obvious code.

```javascript
// ❌ AVOID - Obvious comments
// Set user to null
setUser(null);

// Increment counter by 1
setCounter(counter + 1);

// ✅ PREFER - Meaningful context
// Reset user to trigger re-authentication flow
setUser(null);

// Increment retry counter (max 3 attempts per company policy)
setCounter(counter + 1);

// Business rule: Premium users get 2x the standard rate limit
const rateLimit = user.isPremium ? STANDARD_LIMIT * 2 : STANDARD_LIMIT;
```

These patterns represent team agreements on code quality that go beyond what automated tools can enforce. Regular code reviews should reference these patterns to maintain consistency.

### Enforcing Un-lintable Conventions

Since these patterns can't be automatically enforced, teams should:

1. **Code Review Checklist**: Include these patterns in PR review templates
2. **Onboarding Documentation**: Teach new developers these patterns explicitly
3. **Pair Programming**: Share these patterns through collaborative coding
4. **Team Discussions**: Regularly review and update these conventions
5. **Examples Library**: Maintain a collection of good/bad examples from your codebase

Remember: These conventions evolve with your team's experience. Document new patterns as they emerge and retire ones that no longer serve their purpose.

---

## Framework Summary

This comprehensive React best practices framework covers **24 distinct categories** organized into **6 major themes**:

### 🏗️ **Architecture & Standards (Categories 1-3)**
Foundational patterns for code organization, naming conventions, and component design including React 19+ patterns.

### 💾 **Data & State (Categories 4-5)**
Complete state management hierarchy and API integration strategies with concrete decision matrices.

### ✅ **Quality & Testing (Categories 6-7)**
Comprehensive testing strategies and automated quality tools with measurable targets.

### ⚡ **Performance & UX (Categories 8-12)**
Performance optimization with concrete budgets, accessibility with WCAG targets, and internationalization support.

### 🔒 **Security & Reliability (Categories 13-14)**
Frontend-specific security patterns and comprehensive observability with telemetry specifications.

### 🚀 **Operations & Delivery (Categories 15-24)**
Everything from documentation and developer experience to deployment, governance, and automation.

### Key Differentiators

✨ **Concrete Metrics**: Performance budgets, accessibility targets, and quality gates with specific numbers

📊 **Decision Matrices**: Clear guidelines for choosing between competing approaches

🎯 **Golden Paths**: Battle-tested recipes for common scenarios

🤖 **Automation Focus**: Scaffolding, generators, and pre-commit automation

📝 **Governance Framework**: ADRs, ownership policies, and deprecation playbooks

🔄 **Living Document**: Regular review cycles and metrics-driven improvements

This framework provides not just guidelines but a complete operational blueprint for building and maintaining production-grade React applications at scale.