#!/usr/bin/env bash
# Build the Logoscreen Electron app for Raspberry Pi and drop a desktop shortcut.
# This script packages the app for the current machine architecture (armv7l/arm64/x64)
# and writes a .desktop launcher to the user's Desktop folder.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
DIST_DIR="$PROJECT_ROOT/dist"

# Map uname architecture to electron-packager arch flag.
case "$(uname -m)" in
  armv7l|armv6l)
    TARGET_ARCH="armv7l"
    ;;
  aarch64|arm64)
    TARGET_ARCH="arm64"
    ;;
  x86_64|amd64)
    TARGET_ARCH="x64"
    ;;
  *)
    echo "Unsupported architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

echo "Using target architecture: $TARGET_ARCH"

echo "Installing dependencies (including dev dependencies for packaging)..."
npm install

echo "Packaging the app for production..."
npx --yes electron-packager "$PROJECT_ROOT" logoscreen \
  --platform=linux \
  --arch="$TARGET_ARCH" \
  --out="$DIST_DIR" \
  --overwrite \
  --prune=true \
  --asar \
  --executable-name="logoscreen"

APP_DIR="$DIST_DIR/logoscreen-linux-$TARGET_ARCH"
APP_BIN="$APP_DIR/logoscreen"

if [[ ! -x "$APP_BIN" ]]; then
  echo "Expected packaged binary not found at $APP_BIN" >&2
  exit 1
fi

# Resolve the desktop directory, favoring XDG if present.
if [[ -f "$HOME/.config/user-dirs.dirs" ]]; then
  # shellcheck disable=SC1090
  source "$HOME/.config/user-dirs.dirs"
fi
DESKTOP_DIR="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
DESKTOP_DIR=${DESKTOP_DIR/#\~/$HOME}
mkdir -p "$DESKTOP_DIR"

DESKTOP_FILE="$DESKTOP_DIR/Logoscreen.desktop"

cat > "$DESKTOP_FILE" <<EOF_DESKTOP
[Desktop Entry]
Type=Application
Name=Logoscreen
Comment=Launch the Logoscreen display app
Exec=$APP_BIN
Icon=applications-graphics
Terminal=false
Categories=Utility;
EOF_DESKTOP

chmod +x "$DESKTOP_FILE"

echo "Build complete: $APP_BIN"
echo "Desktop shortcut created at: $DESKTOP_FILE"
