#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────
#  Ubuntu kurulum scripti: Docker + Node.js
# ─────────────────────────────────────────

NODE_VERSION="${NODE_VERSION:-22}"   # istersen değiştir: 18, 20, 22

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Root kontrolü ──────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Bu scripti root veya sudo ile çalıştır: sudo bash $0"

# ── Sistem güncellemesi ────────────────────────────────────────────────────────
info "Paket listesi güncelleniyor..."
apt-get update -qq

info "Gerekli bağımlılıklar kuruluyor..."
apt-get install -y -qq \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  apt-transport-https

# ══════════════════════════════════════════
#  DOCKER
# ══════════════════════════════════════════
if command -v docker &>/dev/null; then
  warn "Docker zaten kurulu: $(docker --version)"
else
  info "Docker kuruluyor..."

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -qq
  apt-get install -y -qq \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

  systemctl enable --now docker

  info "Docker kuruldu: $(docker --version)"
fi

# Mevcut kullanıcıyı docker grubuna ekle (sudo gerektirmeden kullanmak için)
REAL_USER="${SUDO_USER:-$USER}"
if [[ "$REAL_USER" != "root" ]]; then
  usermod -aG docker "$REAL_USER"
  warn "Kullanıcı '$REAL_USER' docker grubuna eklendi. Değişikliğin etkili olması için oturumu yeniden başlat (logout/login)."
fi

# ══════════════════════════════════════════
#  NODE.JS  (nvm üzerinden)
# ══════════════════════════════════════════
NVM_DIR="/usr/local/nvm"

if [[ -d "$NVM_DIR" ]]; then
  warn "nvm dizini zaten mevcut: $NVM_DIR"
else
  info "nvm kuruluyor..."
  mkdir -p "$NVM_DIR"
  # En son nvm sürümünü indir
  NVM_LATEST=$(curl -fsSL https://api.github.com/repos/nvm-sh/nvm/releases/latest \
    | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/')
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_LATEST}/install.sh" \
    | NVM_DIR="$NVM_DIR" bash
fi

# nvm'i bu oturumda yükle
export NVM_DIR
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"

# Tüm kullanıcılar için nvm erişimi sağla
NVM_PROFILE="/etc/profile.d/nvm.sh"
if [[ ! -f "$NVM_PROFILE" ]]; then
  cat > "$NVM_PROFILE" <<'EOF'
export NVM_DIR="/usr/local/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && source "$NVM_DIR/bash_completion"
EOF
  info "nvm profili oluşturuldu: $NVM_PROFILE"
fi

if nvm ls "$NODE_VERSION" &>/dev/null; then
  warn "Node.js $NODE_VERSION zaten kurulu."
else
  info "Node.js $NODE_VERSION kuruluyor..."
  nvm install "$NODE_VERSION"
fi

nvm use "$NODE_VERSION"
nvm alias default "$NODE_VERSION"

info "Node.js kuruldu : $(node --version)"
info "npm kuruldu     : $(npm --version)"

# ── Özet ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  Kurulum tamamlandı!${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""
echo "  Docker  : $(docker --version)"
echo "  Node.js : $(node --version)"
echo "  npm     : $(npm --version)"
echo ""
warn "Oturumu yeniden başlat (logout/login) — docker grubunu ve nvm'i aktif etmek için."
