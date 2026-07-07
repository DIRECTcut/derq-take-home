# Traffic Data Deploy

Docker-based VPS deployment for the traffic-data application.

## Prerequisites

- Local `ansible` installed.
- SSH key access to the VPS.
- `deploy/.env` created from `deploy/.env.example`.
- `deploy/prod/.env` created from `deploy/prod/.env.example`.
- A registry image reference in `DEPLOY_IMAGE`.
- Registry credentials in `REGISTRY_USERNAME` and `REGISTRY_PASSWORD` when the image is private.

## First-time setup

```bash
cp deploy/.env.example deploy/.env
cp deploy/prod/.env.example deploy/prod/.env
# edit both files

cd deploy
make prod-init
make prod
make prod-login
make prod-up
```

`prod-init` installs Docker, creates the project directory, and hardens SSH after confirming an authorized key exists for the deploy user.

## Runtime contract

The remote stack runs three containers:

- `postgres` for the source-of-truth database
- `postgrest` for chart-facing read models
- `api` for the Fastify runtime and built frontend assets

The deploy path is image-driven.
The host does not build application source.
It pulls the immutable image reference supplied through `DEPLOY_IMAGE`.

## CLI surface

- `make prod-init`: bootstrap the VPS, install Docker, and apply minimal SSH hardening
- `make prod`: sync deploy assets and the runtime environment file
- `make prod-login`: authenticate the remote Docker host to the image registry
- `make prod-up`: pull the image, run migrations and seed, then start the stack
- `make prod-restart`: restart the running stack
- `make prod-logs`: stream production logs
- `make prod-ssh`: open a shell on the VPS host
- `make prod-migrate`: run backend migrations on the VPS
- `make prod-seed`: reseed traffic data on the VPS
- `make prod-status`: print `docker compose ps` on the VPS
- `make prod-down`: stop the stack and remove volumes

## GitHub Actions use

The performance workflow can generate `deploy/.env` and `deploy/prod/.env` dynamically per droplet.
It is expected to:

1. create an ephemeral SSH key pair
2. register the public key with DigitalOcean
3. create one or more review droplets
4. write droplet-specific values such as `SERVER_PROD`, `DEPLOY_IMAGE`, and `DEPLOY_PUBLIC_POSTGREST_URL`
5. run `make prod-init`, `make prod`, `make prod-login`, and `make prod-up`

