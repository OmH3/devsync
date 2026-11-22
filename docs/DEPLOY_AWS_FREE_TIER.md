# Deploying DevSync on AWS for $0 (time-limited, single EC2 instance)

> [!IMPORTANT]
> This is a conditional, time-limited free deployment, not permanent free hosting. It
> assumes a **new AWS account on the Free plan** (credits / six-month window). Verify your
> eligibility and remaining credits in the AWS Billing console before provisioning. Budget alerts
> do not cap spending; staying on the Free plan (not upgrading) is what protects you.

## Architecture

```
Browser --HTTPS--> Caddy (EC2) --+--> static React build
                                 +--> Node/Express + Socket.IO  (one process)
                                        |
                                        +--> MongoDB 7 replica set (private, EBS volume)
```

Everything runs from [`docker-compose.prod.yml`](../docker-compose.prod.yml) on one instance.
Code execution, Google sign-in and audio/video (Stream) are **off** in this profile.

## 1. Provision (AWS console)

1. Create an EC2 instance, **Ubuntu 24.04 LTS**, the largest *Free-plan-eligible* type shown in the launch
   wizard (at least 1 GiB RAM; add a 2 GiB swap file if it is a 1 GiB type). Storage: 20 GiB gp3.
2. Security group: inbound 80 and 443 from anywhere; 22 **from your IP only**. Do not open 27017 or 8000.
3. Allocate an Elastic IP and attach it **to the running instance** (an unattached Elastic IP is billed).
   Public IPv4 addresses can carry charges outside the Free plan, so check the current pricing page.
4. Hostname: use `devsync.<your-ip-with-dashes>.sslip.io` (free, no registration) or a free DuckDNS name.

## 2. Install Docker

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER && newgrp docker
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
```

## 3. Configure and start

```bash
git clone -b perf/node-react-ux https://github.com/OmH3/devsync.git && cd devsync
cp .env.production.example .env.production
# edit: DOMAIN, PUBLIC_ORIGIN, FRONTEND_ORIGIN, and SESSION_SECRET=$(openssl rand -hex 32)
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
# First deployment: seed roles (idempotent upsert; safe to re-run, keeps existing role ids).
docker compose --env-file .env.production -f docker-compose.prod.yml exec app node src/seeders/role.seeder.js
```

Verify: `curl -fsS https://<DOMAIN>/api/health/ready` returns `{"status":"ready"}`, then register an
account in the browser. Caddy obtains the HTTPS certificate automatically once DNS resolves.

## 4. Operate

| Task | Command |
| --- | --- |
| Logs | `docker compose -f docker-compose.prod.yml logs -f app` (Docker logs rotate; set `--log-opt max-size` in `/etc/docker/daemon.json` if needed) |
| Update | `git pull && docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build` |
| Backup | `./deploy/backup.sh` (cron daily; copy off-instance before the free period ends) |
| Memory | `docker stats --no-stream`; resize only if measured usage requires it |

## Limits to keep in mind

- Single Node process only: the session cache and Socket.IO rooms are in-process. Do not scale to
  multiple app containers without the Redis milestone (M13 in the plan).
- Free plan ends after its window or when credits run out; export data first.
- Outbound transfer is capped by the Free plan; this app transfers little unless many large files are served.
- Alternative providers: GCP's e2-micro is free only if you also avoid billable external IPv4 charges;
  Azure's free App Service allows too few WebSocket connections for realtime collaboration.

## Résumé wording

"Deployed a containerized React/Node.js real-time collaboration app on AWS EC2 (Docker, Caddy HTTPS,
MongoDB replica set) with measured performance improvements." Quote only benchmark numbers you
reproduced; see `server/BENCHMARKS.md`.
