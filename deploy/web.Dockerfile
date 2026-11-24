# Builds the React app and serves it with Caddy (automatic HTTPS + reverse proxy to the API).
FROM node:24-slim AS build
WORKDIR /client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# Empty = same origin (the proxy serves both the UI and /api). VITE_* values are public.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /client/dist /srv
