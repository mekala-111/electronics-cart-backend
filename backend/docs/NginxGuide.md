# Nginx Guide

Configs: `backend/nginx/`.

1. Copy `nginx.conf` to `/etc/nginx/nginx.conf` (or merge events/http).
2. Install `snippets/ec-proxy-params.conf` under `/etc/nginx/snippets/`.
3. Install `conf.d/api.conf` and replace `api.example.com` + cert paths.
4. Enable Brotli module if available (commented directives included).
5. `nginx -t && systemctl reload nginx`

Features: TLS, HTTP/2, gzip, WebSocket `/socket.io/`, rate zones, security headers, 25MB uploads, `server_tokens off`.
