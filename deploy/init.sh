#!/usr/bin/env bash

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt_retry() {
  local attempt

  for attempt in 1 2 3 4 5; do
    if apt "$@"; then
      return 0
    fi

    sleep $((attempt * 5))
  done

  return 1
}

project_dir="${PROJECT_DIR:-/root/traffic-data-web-app}"
root_login_mode="${ROOT_LOGIN_MODE:-prohibit-password}"
target_user="${TARGET_USER:-$(id -un)}"
ssh_dir="$(getent passwd "$target_user" | cut -d: -f6)/.ssh"
authorized_keys="$ssh_dir/authorized_keys"
sshd_drop_in="/etc/ssh/sshd_config.d/60-traffic-data-web-app-hardening.conf"

if [ "$root_login_mode" != "prohibit-password" ] && [ "$root_login_mode" != "no" ]; then
  echo "ROOT_LOGIN_MODE must be prohibit-password or no." >&2
  exit 1
fi

if [ ! -s "$authorized_keys" ]; then
  echo "Refusing to harden SSH without an authorized key for $target_user at $authorized_keys." >&2
  exit 1
fi

apt_retry update
apt_retry upgrade -y
apt_retry install -y \
  ca-certificates \
  curl \
  git \
  gnupg \
  python3 \
  python3-pip \
  rsync \
  lsb-release \
  apt-transport-https \
  software-properties-common

if [ ! -e /usr/bin/python ]; then
  ln -s /usr/bin/python3 /usr/bin/python
fi

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

cat > /etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable
EOF

apt_retry update
apt_retry install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

mkdir -p "$project_dir"

mkdir -p /etc/ssh/sshd_config.d
cat > "$sshd_drop_in" <<EOF
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
PermitRootLogin $root_login_mode
EOF

sshd -t
systemctl reload ssh || systemctl reload sshd

echo "Bootstrap complete."
echo "Project directory: $project_dir"
echo "SSH password authentication disabled."
