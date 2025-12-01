    # AWS Favorites Quickbar - Quick Start Guide

    A browser extension that adds a customizable favorites bar to the AWS Console, making it easy to access your most-used AWS services.

    ## Installation

    ### Chrome

    #### Option 1: Install from Chrome Web Store (Recommended)
    *Coming soon - extension pending review*

    #### Option 2: Install Manually (Developer Mode)

    1. Download `aws-favorites-quickbar-chrome.zip`
    2. Unzip the file to a folder on your computer
    3. Open Chrome and navigate to `chrome://extensions/`
    4. Enable "Developer mode" (toggle in the top-right corner)
    5. Click "Load unpacked"
    6. Select the unzipped folder
    7. The extension icon should appear in your toolbar

    ### Firefox

    #### Option 1: Install from Firefox Add-ons (Recommended)
    *Coming soon - extension pending review*

    #### Option 2: Install Temporarily (For Testing)

    1. Download `aws-favorites-quickbar-firefox.zip`
    2. Open Firefox and navigate to `about:debugging`
    3. Click "This Firefox" in the left sidebar
    4. Click "Load Temporary Add-on..."
    5. Navigate to the downloaded ZIP file and select it
    6. The extension will load (note: temporary add-ons are removed when Firefox closes)

    #### Option 3: Install Permanently (Developer Mode)

    1. Unzip `aws-favorites-quickbar-firefox.zip`
    2. Open Firefox and navigate to `about:config`
    3. Search for `xpinstall.signatures.required` and set it to `false`
    4. Navigate to `about:addons`
    5. Click the gear icon and select "Install Add-on From File..."
    6. Select the `manifest.json` file from the unzipped folder

    ## Quick Start

    ### First Time Setup

    1. **Navigate to AWS Console**: Go to https://console.aws.amazon.com/
    2. **Add a Native Favorite** (Required): 
    - In the AWS Console, click the star icon next to any service to add it as a native favorite
    - This creates the favorites bar that the extension uses
    - You only need to do this once
    3. **Open the Extension**: Click the extension icon in your browser toolbar
    4. **Select Your Favorites**: 
    - Search for AWS services (e.g., "S3", "EC2", "Lambda")
    - Click the checkbox next to services you want to favorite
    5. **View Your Quickbar**: Your favorites will appear in a bar at the top of the AWS Console

    ### Using the Extension

    **Add/Remove Favorites:**
    - Click the extension icon
    - Check/uncheck services to add or remove them

    **Reorder Favorites:**
    - In the extension popup, drag and drop services to reorder them
    - Your order is saved automatically

    **Adjust Number of Services:**
    - In the extension popup, change the "Max services" number
    - This controls how many services appear in the quickbar

    **Access Services:**
    - Click any service in the quickbar to navigate to it
    - The quickbar appears on all AWS Console pages

    ### Features

    ✨ **Smart Service Detection**: Automatically detects your recently visited AWS services  
    🎯 **Custom Favorites**: Pin your most-used services for quick access  
    🔄 **Drag & Drop**: Reorder favorites with simple drag and drop  
    💾 **Persistent Storage**: Your preferences sync across browser sessions  
    🎨 **Native Look**: Matches AWS Console styling seamlessly  
    🌍 **Multi-Region**: Works across all AWS regions  
    🔒 **Privacy First**: All data stored locally in your browser

    ## Troubleshooting

    **Quickbar not appearing?**
    - **Important**: You must add at least one native AWS favorite first (click the star icon next to any service in AWS Console)
    - Make sure you're on an AWS Console page (console.aws.amazon.com)
    - Try refreshing the page
    - Check that the extension is enabled in your browser

    **Services not saving?**
    - Check browser console for errors (F12)
    - Ensure you have storage permissions enabled
    - Try removing and re-adding the extension

    **Extension icon not visible?**
    - Click the puzzle piece icon in Chrome or the extensions icon in Firefox
    - Pin the AWS Favorites Quickbar extension to your toolbar

    ## Support

    Found a bug or have a feature request? Please open an issue on our GitHub repository.

    ## Privacy

    This extension:
    - ✅ Stores all data locally in your browser
    - ✅ Does not collect or transmit any personal information
    - ✅ Does not track your usage
    - ✅ Only accesses AWS Console pages
    - ✅ Open source - you can review the code

    ## Browser Compatibility

    - Chrome 88+ (Manifest V3)
    - Firefox 109+ (Manifest V3)
    - Edge 88+ (uses Chrome build)

    ---

    **Enjoy faster AWS Console navigation!** 🚀
