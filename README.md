# LogoScreen

An offline Electron app for Raspberry Pi that displays a logo centered on screen with kiosk mode support. Perfect for digital signage, reception displays, or any scenario where you need to show a logo on a dedicated screen.

## Features

- **Offline Operation**: Works without network connection
- **Image Upload**: Support for PNG, JPG, JPEG, GIF, BMP, and WebP formats
- **Centered Display**: Logo is automatically centered horizontally and vertically
- **Kiosk Mode**: Full-screen kiosk mode with keyboard toggle
- **Persistent Storage**: Logo is saved locally and restored on app restart
- **Recent Logos**: Quick access to recently opened logos
- **Background Color**: Toggle between black and white background
- **Raspberry Pi Optimized**: Designed for small portable monitors

## Installation

### Prerequisites

- Node.js 18+ and npm
- For Raspberry Pi: Raspberry Pi OS with desktop environment

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd logoscreen

# Install dependencies
npm install

# Run the application
npm start
```

## Usage

### Uploading a Logo

1. Press `Ctrl+O` or click the "Upload Logo" button
2. Select an image file (PNG, JPG, GIF, BMP, or WebP)
3. The logo will be displayed centered on screen

### Keyboard & Mouse Controls

| Control | Action |
|----------|--------|
| `F11` | Toggle kiosk/fullscreen mode |
| `Escape` | Exit kiosk mode |
| `Ctrl+Shift+K` | Toggle kiosk mode (alternative) |
| `Ctrl+O` | Open file dialog to upload logo |
| `Ctrl+B` | Toggle background color (black/white) |
| Double-click/tap anywhere | Exit kiosk mode quickly |

### Controls

When hovering over the window, you'll see:
- **Upload Logo**: Select a new logo image
- **Recent**: Opens a dropdown with recently used logos
- **Enter/Exit Kiosk Mode**: Toggle fullscreen kiosk mode
- **Clear Logo**: Remove the current logo
- **Background Color Buttons**: Black/white circle buttons to change background

## Raspberry Pi Setup

### Auto-start on Boot

1. Create a desktop entry:
```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/logoscreen.desktop
```

2. Add the following content:
```ini
[Desktop Entry]
Type=Application
Name=LogoScreen
Exec=/path/to/logoscreen/start.sh
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
```

3. Create a start script (`start.sh`):
```bash
#!/bin/bash
cd /path/to/logoscreen
npm start -- --kiosk
```

### Production build and desktop shortcut (Pi)

To package the app for Raspberry Pi and drop a desktop launcher automatically, run:

```bash
./build_for_pi.sh
```

The script installs dependencies, packages the app for the current Pi architecture, and writes a `Logoscreen.desktop` launcher to your Desktop (honoring XDG desktop paths).

### Disable Screen Blanking

To prevent the screen from turning off:
```bash
sudo nano /etc/lightdm/lightdm.conf
```

Add under `[SeatDefaults]`:
```
xserver-command=X -s 0 -dpms
```

## Development

```bash
# Run in development mode
npm start

# The app will open in a window
# Use F11 to toggle fullscreen/kiosk mode
```

## Building for Production

For creating a distributable package:

```bash
# Install electron-builder
npm install electron-builder --save-dev

# Build for current platform
npm run build
```

## File Structure

```
logoscreen/
├── main.js          # Electron main process
├── preload.js       # Preload script for IPC
├── index.html       # Main HTML file
├── renderer.js      # Renderer process JavaScript
├── package.json     # Project configuration
└── README.md        # This file
```

## License

ISC
