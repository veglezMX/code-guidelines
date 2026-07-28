# Full Nginx Configuration

## Assumptions

This example represents a public Nginx gateway that terminates TLS and routes to Kubernetes services.

Replace service DNS names, certificate paths, and CSP endpoints for your environment.

This configuration requires **Nginx 1.29.3 or newer** because it uses `add_header_inherit merge`. The verified July 23, 2026 baselines are Nginx mainline `1.31.3` and stable `1.30.4`.

The configuration intentionally:

- Routes `/child0/*` to the shell document.
- Routes `/mfe/child0/*` to independently deployed Child0 assets.
- Preserves API paths.
- Serves the MSAL bridge without COOP.
- Uses no-cache for HTML, runtime config, manifests, and the redirect bridge.
- Uses immutable caching for hashed assets.
- Provides a strict initial CSP.

## Complete example

```nginx
worker_processes auto;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    multi_accept on;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server_tokens off;

    # Introduced in Nginx 1.29.3. Location-level cache headers are
    # merged with the server-level security headers instead of replacing them.
    add_header_inherit merge;

    log_format json_combined escape=json
        '{'
          '"time":"$time_iso8601",'
          '"request_id":"$request_id",'
          '"remote_addr":"$remote_addr",'
          '"method":"$request_method",'
          '"uri":"$uri",'
          '"status":$status,'
          '"bytes_sent":$body_bytes_sent,'
          '"request_time":$request_time,'
          '"upstream_time":"$upstream_response_time",'
          '"host":"$host",'
          '"user_agent":"$http_user_agent"'
        '}';

    access_log /var/log/nginx/access.log json_combined;
    error_log  /var/log/nginx/error.log warn;

    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    client_max_body_size 10m;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 5;
    gzip_types
        application/javascript
        application/json
        application/manifest+json
        application/xml
        image/svg+xml
        text/css
        text/plain;

    map $http_upgrade $connection_upgrade {
        default upgrade;
        ""      close;
    }

    # MSAL Browser v5 bridge must not receive a COOP header.
    map $uri $coop_value {
        default             "same-origin";
        /auth-redirect.html "";
    }

    map $uri $cache_control_value {
        default                       "no-store";
        ~^/assets/                     "public, max-age=31536000, immutable";
        ~^/mfe/[^/]+/assets/           "public, max-age=31536000, immutable";
    }

    limit_req_zone
        $binary_remote_addr
        zone=api_per_ip:10m
        rate=30r/s;

    upstream app_shell {
        server app-shell.frontend.svc.cluster.local:8080;
        keepalive 32;
    }

    upstream app_child0_assets {
        server app-child0.frontend.svc.cluster.local:8080;
        keepalive 16;
    }

    upstream portal_api {
        server portal-api.backend.svc.cluster.local:8080;
        keepalive 32;
    }

    upstream child0_api {
        server child0-api.backend.svc.cluster.local:8080;
        keepalive 32;
    }

    server {
        listen 80;
        listen [::]:80;
        server_name portal.example.com;

        location = /nginx-health {
            access_log off;
            add_header Content-Type text/plain;
            return 200 "healthy\n";
        }

        location / {
            return 308 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name portal.example.com;

        ssl_certificate     /etc/nginx/tls/tls.crt;
        ssl_certificate_key /etc/nginx/tls/tls.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_session_cache shared:TLS:20m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;

        add_header Strict-Transport-Security
            "max-age=31536000; includeSubDomains"
            always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy
            "strict-origin-when-cross-origin"
            always;
        add_header Permissions-Policy
            "camera=(), microphone=(), geolocation=()"
            always;
        add_header Cross-Origin-Resource-Policy
            "same-origin"
            always;
        add_header Cross-Origin-Opener-Policy
            $coop_value
            always;
        add_header Content-Security-Policy
            "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://login.microsoftonline.com; frame-src https://login.microsoftonline.com; form-action 'self' https://login.microsoftonline.com; upgrade-insecure-requests"
            always;

        location = /nginx-health {
            access_log off;
            add_header Content-Type text/plain;
            return 200 "healthy\n";
        }

        # Dedicated MSAL Browser v5 redirect bridge.
        # $coop_value resolves to an empty value, so no COOP header is emitted.
        location = /auth-redirect.html {
            proxy_pass http://app_shell;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;

            proxy_hide_header Cross-Origin-Opener-Policy;
            add_header Cache-Control "no-store" always;
            add_header Pragma "no-cache" always;
            add_header Expires "0" always;
        }

        # Runtime config must be revalidated on every deployment/session.
        location = /runtime-config.json {
            proxy_pass http://app_shell;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;

            add_header Cache-Control "no-store" always;
            add_header Pragma "no-cache" always;
            add_header Expires "0" always;
        }

        # Portal-level authorization API.
        location /api/portal/ {
            limit_req zone=api_per_ip burst=60 nodelay;

            proxy_pass http://portal_api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;
            proxy_set_header X-Forwarded-Host $host;

            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            proxy_buffering on;

            add_header Cache-Control "no-store" always;
        }

        # Child0 domain API.
        location /api/child0/ {
            limit_req zone=api_per_ip burst=60 nodelay;

            proxy_pass http://child0_api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;
            proxy_set_header X-Forwarded-Host $host;

            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            proxy_buffering on;

            add_header Cache-Control "no-store" always;
        }

        # Child manifest is independently deployable and must be revalidated.
        location = /mfe/child0/manifest.json {
            proxy_pass http://app_child0_assets;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;

            add_header Cache-Control "no-cache, max-age=0" always;
        }

        # Hashed Child0 build artifacts.
        location ^~ /mfe/child0/assets/ {
            proxy_pass http://app_child0_assets;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;

            add_header Cache-Control
                "public, max-age=31536000, immutable"
                always;
        }

        # Other Child0 public files, if required.
        location ^~ /mfe/child0/ {
            proxy_pass http://app_child0_assets;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;

            add_header Cache-Control "no-cache" always;
        }

        # Shell hashed assets.
        location ^~ /assets/ {
            proxy_pass http://app_shell;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;

            add_header Cache-Control
                "public, max-age=31536000, immutable"
                always;
        }

        # Browser routes, including /child0/*, return the shell application.
        location / {
            proxy_pass http://app_shell;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;

            add_header Cache-Control "no-store" always;
        }
    }
}
```

## Header inheritance requirement

Nginx normally stops inheriting parent `add_header` directives when a location defines its own `add_header`. That can silently remove CSP, HSTS, COOP, and other security headers from locations that add only `Cache-Control`.

This example uses:

```nginx
add_header_inherit merge;
```

The directive was introduced in Nginx `1.29.3`. It merges location-level cache headers with server-level security headers. On older Nginx versions, do not use this configuration unchanged. Instead, place the complete security-header set in a reusable include and include it in every location that defines `add_header`, or upgrade Nginx.

The redirect bridge remains the exception: `$coop_value` resolves to an empty value for `/auth-redirect.html`, so Nginx does not emit COOP for that response. `proxy_hide_header Cross-Origin-Opener-Policy` also prevents an upstream bridge response from adding it.

Test actual responses for every important path:

```bash
curl -I https://portal.example.com/
curl -I https://portal.example.com/child0/orders
curl -I https://portal.example.com/auth-redirect.html
curl -I https://portal.example.com/runtime-config.json
curl -I https://portal.example.com/mfe/child0/manifest.json
curl -I https://portal.example.com/mfe/child0/assets/entry.HASH.js
```

The expected result is:

- Shell HTML and browser routes receive the full security-header set plus `Cache-Control: no-store`.
- Hashed assets receive the full security-header set plus immutable caching.
- API responses receive the full security-header set plus `Cache-Control: no-store`.
- The MSAL redirect bridge receives the full set except `Cross-Origin-Opener-Policy`, plus `Cache-Control: no-store`.

## If TLS terminates before this Nginx

When a Kubernetes ingress controller terminates TLS:

- Remove the internal certificate directives.
- Listen on the service port.
- Preserve and trust `X-Forwarded-Proto` only from the ingress network.
- Add HSTS at the public TLS-terminating layer.
- Keep the route-specific COOP exception at whichever layer emits COOP.
