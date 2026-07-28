# Glossary

## Access token

A credential issued for a specific protected resource. The API identified by the token audience validates and authorizes it.

## Active account

The account selected by the app shell for token requests and UI state. Multiple cached accounts require an explicit selection policy.

## App role

An application-defined role issued in a token after assignment. App roles provide stable application semantics compared with embedding directory group IDs in UI code.

## Application entitlement

A portal-level decision describing whether the authenticated user may launch a child application.

## Authentication

The process of establishing the user’s identity.

## Authorization

The process of deciding whether an authenticated principal may perform an operation.

## Authorization code flow with PKCE

The OAuth flow used by browser SPAs. PKCE binds the authorization response to the client-generated request and protects the authorization code from interception reuse.

## Audience (`aud`)

The token claim identifying the intended API. An API must reject tokens issued for another resource.

## BroadcastChannel

A same-origin browser API for sending structured messages between tabs, windows, frames, and workers in the same compatible storage partition.

In this design it carries application session events, never tokens.

## Child application

An independently built and deployed React application mounted by the app shell under a route such as `/child0/*`.

## Child manifest

A deployment document describing a child entry URL, version, application ID, and runtime-contract version.

## COOP

Cross-Origin-Opener-Policy. A response header that controls browsing-context-group isolation and can sever opener relationships used by traditional authentication popup flows.

## CSP

Content Security Policy. A browser-enforced allowlist for scripts, styles, connections, frames, and other resources. It is a primary control against XSS impact.

## Delegated scope

An API permission exercised by an application on behalf of a signed-in user, commonly represented in the `scp` claim.

## Domain profile

A child-specific representation of the user, including domain membership, permissions, constraints, and feature entitlements.

## ID token

An OpenID Connect token containing authentication information for the client application. It is not a replacement for an API access token.

## Interactive authentication

A login or consent operation requiring browser navigation or a popup. Interactive operations must be centrally coordinated to prevent overlap.

## `localStorage`

Same-origin persistent browser storage shared by tabs. It is used by MSAL in this design because cross-tab account synchronization is required.

## MSAL

Microsoft Authentication Library. The shell uses MSAL Browser and MSAL React to authenticate users and acquire access tokens.

## MSAL redirect bridge

A dedicated MSAL Browser v5 page that processes authentication responses and broadcasts them to the main application frame. It must not receive a COOP header.

## Micro-frontend runtime contract

The stable interface through which the shell mounts a child and injects authentication state, navigation, telemetry, and a resource-restricted HTTP client.

## OIDC

OpenID Connect. The identity layer used for authentication and ID tokens.

## OAuth 2.0

The authorization protocol used to obtain access tokens for APIs.

## Portal API

The backend resource that owns portal profile and child-application entitlement decisions.

## PKCE

Proof Key for Code Exchange. A mechanism that protects authorization-code redemption for public clients.

## Resource authorization

An API decision involving the actual domain object, such as whether a user may approve a particular order.

## Resource-restricted HTTP client

An injected HTTP client bound to one base URL and one scope set. It prevents child code from requesting arbitrary tokens or calling arbitrary API resources.

## Same origin

The same scheme, host, and port. Paths do not create separate browser security boundaries.

## Silent token acquisition

An MSAL operation that obtains a cached or refreshed access token without displaying user interaction.

## SPA

Single-page application.

## Tenant

A Microsoft Entra directory boundary. APIs should validate permitted tenant IDs.

## XSS

Cross-site scripting. Untrusted script execution in the application origin. MSAL cache encryption is not an XSS defense.
