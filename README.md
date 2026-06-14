> [!WARNING]
> **Note:** A lot of this project is currently untested and needs more work. Feedback is greatly appreciated!

# Alty

Alty is a cross-platform browser extension that uses AI to generate image alt text. It includes a backend server component to handle the AI generation requests, as well as configuration options for BYOK & local models.

## Browser Extension

The browser extensions are built using [WXT](https://wxt.dev/), which makes it easy to maintain Manifest V2 and Manifest V3 configurations from a single codebase. All extension source code is located in the `extension/` directory.

### Development

To run the extension in development mode with hot-reloading:

1. Navigate to the extension directory:
   ```bash
   cd extension
   ```

2. Run the development script for your target browser:
   - **Chrome / Edge (Manifest V3):**
     ```bash
     npm run dev
     ```
   - **Firefox (Manifest V2):**
     ```bash
     npm run dev:firefox
     ```
   - **Safari (Manifest V3):**
     ```bash
     npm run dev:safari
     ```

### Building for Production

To build the extensions for production or to generate `.zip` files for store distribution:

1. Navigate to the extension directory:
   ```bash
   cd extension
   ```

2. Run the appropriate build or zip scripts:
   - **Chrome / Edge:**
     ```bash
     npm run build      # Builds the extension to .output/chrome-mv3
     npm run zip        # Zips the extension for distribution
     ```
   - **Firefox:**
     ```bash
     npm run build:firefox # Builds the extension to .output/firefox-mv2
     npm run zip:firefox   # Zips the extension for distribution
     ```
   - **Safari:**
     ```bash
     npm run build:safari  # Builds the extension to .output/safari-mv3
     npm run zip:safari    # Zips the extension for distribution
     ```

### Loading Unpacked Extensions

If you just ran `npm run build` (or the respective build command for your browser) and want to test the unpacked extension:

- **Chrome / Edge:** Open `chrome://extensions/` (or `edge://extensions/`), enable **Developer mode**, click **Load unpacked**, and select the `extension/.output/chrome-mv3` folder.
- **Firefox:** Open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select the `manifest.json` file inside the `extension/.output/firefox-mv2` folder.
- **Safari:** Ensure the Develop menu is enabled in Safari preferences. Enable "Allow Unsigned Extensions" in the Develop menu, then load the built Safari app/extension.

## Server

The backend server code is located in the `server/` directory. It contains the logic for handling AI generation requests with Gemini Flash 3.5.
