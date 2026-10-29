# Framework Migrator Integration Guide

## Overview
The Framework Migrator is now integrated into the dashboard UI under **Value Added Services** tab. It allows you to convert Selenium test projects to Playwright TypeScript format.

## Features
- 🔄 Convert Selenium Java/Python tests to Playwright TypeScript
- 📦 Support for ZIP project uploads
- 🔍 Automatic framework detection and analysis
- ⚙️ Intelligent test pattern conversion
- 📊 Real-time migration progress tracking
- ⬇️ Direct download of migrated projects

## How to Use

### Step 1: Navigate to Value Added Services
1. Open the dashboard UI
2. Click on the **"Value Added Services"** tab in the top navigation

### Step 2: Select Framework Migrator
1. You'll see a grid of available services:
   - Framework Migrator (🔄)
   - Coverage Analyzer (📊)
   - Performance Monitor (⚡)
2. Click on **"Framework Migrator"** card

### Step 3: Upload Selenium Project
1. You'll see the migration interface with two panels:
   - **Left Panel:** Migration Control
   - **Right Panel:** Migrator Utility (embedded iframe)

2. In the left panel, select your Selenium project ZIP file:
   - Click the upload area or drag & drop your `.zip` file
   - The file name and size will be displayed

### Step 4: Start Migration
1. Click the **"Start Migration"** button
2. Monitor the progress bar as the conversion happens
3. The status will show:
   - "Initializing migration..."
   - Progress percentage (0-100%)
   - "Migration completed successfully!"

### Step 5: Download Converted Project
1. Once migration completes, migration results will show:
   - Number of tests converted
   - Number of files generated
   - Format (TypeScript + Playwright)

2. Click the **"Download"** button to get your converted project

## What Gets Converted

### Java Selenium → Playwright TypeScript
- `WebDriver` → `Page` object (Playwright API)
- `findElement()` → `page.locator()`
- `click()` → `click()`
- `sendKeys()` → `fill()`
- `wait()` → `waitFor()`
- `Assert` → `expect()`
- Annotations → Test structure
- POM patterns → Maintained

### Supported Test Frameworks
- Selenium WebDriver (Java/Python)
- TestNG
- JUnit
- Pytest
- Custom frameworks (pattern-based)

### Project Structure
The migrated project includes:
```
migrated-project/
├── tests/
│   ├── [converted-tests].spec.ts
│   └── ...
├── pages/
│   ├── [page-objects].ts
│   └── ...
├── playwright.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Integration Details

### API Endpoints
The migrator communicates with:
- `POST /api/migrate` - Upload and convert project
- `GET /api/download/:sessionId` - Download migrated project

### Configuration
- **URL:** http://localhost:5174/
- **Port:** 5174
- **Protocol:** HTTP (local development)

### Files Modified
- `src/App.jsx` - Added "Value Added Services" tab
- `src/components/ValueAddedServices.jsx` - Service selector
- `src/components/FrameworkMigrator.jsx` - Migration UI

## Troubleshooting

### Migration Fails
**Error:** "Migration error: ..."
- Check the ZIP file is a valid Selenium project
- Ensure the migrator service is running on localhost:5174
- Check browser console for detailed errors

### iframe Not Loading
**Error:** Blank area in right panel
- Verify localhost:5174 is accessible
- Check CORS settings if using different domain
- Ensure migrator service is running: `npm run dev` in migrator directory

### File Upload Issues
**Error:** "Please select a valid .zip file"
- Only `.zip` files are supported
- Ensure file extension is lowercase `.zip`
- Try with a smaller test file first

## Performance Notes
- ZIP file size: Recommended max 50MB
- Conversion time: Typically 30-60 seconds depending on project size
- Concurrent migrations: One at a time (queue on server)

## Next Steps
1. Ensure migrator service is running: `npm run dev --prefix migrator`
2. Access dashboard UI in browser
3. Navigate to Value Added Services → Framework Migrator
4. Upload your Selenium project ZIP
5. Download the converted Playwright project

## Support
For issues or questions about the migrator:
1. Check the migrator logs at `localhost:5174/logs`
2. Verify backend service status
3. Review the generated error-context files in the results
