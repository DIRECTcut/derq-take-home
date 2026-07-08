-include .env
export

.PHONY: prod-init prod prod-login prod-up prod-restart prod-logs prod-ssh prod-migrate prod-seed prod-status prod-down help

SSH_KEY_ARG := $(if $(SSH_PRIVATE_KEY),-i $(SSH_PRIVATE_KEY),)
SSH := ssh -o StrictHostKeyChecking=no $(SSH_KEY_ARG)
SSH_TTY := ssh -t -o StrictHostKeyChecking=no $(SSH_KEY_ARG)
REMOTE := $(SERVER_PROD_USER)@$(SERVER_PROD)
REMOTE_PROJECT := $(SERVER_PROD_PROJECT_DIR)
ANSIBLE_LOCAL_TEMP := /tmp/traffic-data-ansible-local
ANSIBLE_REMOTE_TEMP := /tmp/traffic-data-ansible-remote

prod-init:
	@$(SSH) $(REMOTE) 'env PROJECT_DIR="'"$(SERVER_PROD_PROJECT_DIR)"'" ROOT_LOGIN_MODE="'"$(SERVER_PROD_ROOT_LOGIN_MODE)"'" TARGET_USER="'"$(SERVER_PROD_USER)"'" bash -s' < init.sh

prod:
	@mkdir -p $(ANSIBLE_LOCAL_TEMP)
	@ANSIBLE_LOCAL_TEMP="$(ANSIBLE_LOCAL_TEMP)" ANSIBLE_REMOTE_TEMP="$(ANSIBLE_REMOTE_TEMP)" ansible-playbook -i inventory.yml prod.yml

prod-login:
	@$(SSH) $(REMOTE) "echo '$(REGISTRY_PASSWORD)' | docker login $(REGISTRY_HOST) -u '$(REGISTRY_USERNAME)' --password-stdin"

prod-up:
	@$(SSH_TTY) $(REMOTE) "cd $(REMOTE_PROJECT) && docker compose pull && docker compose up -d postgres && docker compose run --rm api node dist/scripts/runMigrations.js && docker compose run --rm api node dist/scripts/seedTrafficData.js && docker compose up -d api"

prod-restart:
	@$(SSH_TTY) $(REMOTE) "cd $(REMOTE_PROJECT) && docker compose restart api postgres"

prod-logs:
	@$(SSH_TTY) $(REMOTE) "cd $(REMOTE_PROJECT) && docker compose logs -f api postgres"

prod-ssh:
	@$(SSH_TTY) $(REMOTE) "cd $(REMOTE_PROJECT) && exec bash -l"

prod-migrate:
	@$(SSH_TTY) $(REMOTE) "cd $(REMOTE_PROJECT) && docker compose run --rm api node dist/scripts/runMigrations.js"

prod-seed:
	@$(SSH_TTY) $(REMOTE) "cd $(REMOTE_PROJECT) && docker compose run --rm api node dist/scripts/seedTrafficData.js"

prod-status:
	@$(SSH) $(REMOTE) "cd $(REMOTE_PROJECT) && docker compose ps"

prod-down:
	@$(SSH_TTY) $(REMOTE) "cd $(REMOTE_PROJECT) && docker compose down -v"

help:
	@echo "Available targets:"
	@echo "  prod-init    - Bootstrap the VPS with Docker and minimal SSH hardening"
	@echo "  prod         - Sync deploy assets and runtime env to the VPS"
	@echo "  prod-login   - Log the remote host into the container registry"
	@echo "  prod-up      - Pull the image, run migrations and seed, then start the stack"
	@echo "  prod-restart - Restart the running stack"
	@echo "  prod-logs    - Stream runtime logs"
	@echo "  prod-ssh     - Open an SSH session to the VPS host"
	@echo "  prod-migrate - Run database migrations on the VPS"
	@echo "  prod-seed    - Seed traffic data on the VPS"
	@echo "  prod-status  - Show remote docker compose status"
	@echo "  prod-down    - Stop and remove the stack with volumes"
