import { chromium } from '@playwright/test';

/**
 * Debug Script - Find the exact selector for 2500 Tons
 */

async function debugVolumeSelector() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔍 DEBUG - Finding 2500 Tons Element Selector');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Navigate and setup
    await page.goto('https://www.csx.com/index.cfm/about-us/sustainability/environment/carbon-estimator/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Setup: Click Groceries and select cities
    console.log('Setting up: Click Groceries\n');
    await page.locator('#carbon_b1').click();
    await page.waitForTimeout(500);
    
    console.log('Setting up: Select Birmingham\n');
    await page.locator('select#carbon_basic_start').selectOption('3');
    await page.waitForTimeout(500);
    
    console.log('Setting up: Select Boston\n');
    await page.locator('select#carbon_basic_end').selectOption('4');
    await page.waitForTimeout(1000);

    // Now search for volume-related elements
    console.log('🔎 Searching for Freight Volume elements...\n');
    
    let bodyText = await page.textContent('body') || '';
    let has2500 = bodyText.includes('2500');
    console.log(`Page contains "2500": ${has2500}\n`);
    
    if (!has2500) {
      console.log('Searching for volume-related elements with numbers...\n');
      
      // Look for divs with 4-digit numbers (likely volume options)
      const divsWithNumbers = await page.locator('div:visible').all();
      let foundVolume = false;
      
      for (const div of divsWithNumbers) {
        try {
          const text = await div.textContent();
          if (text && /^\d{4}$/.test(text.trim())) {
            const classList = await div.getAttribute('class');
            const visible = await div.isVisible();
            
            console.log(`Found 4-digit div:`);
            console.log(`  Text: "${text.trim()}"`);
            console.log(`  Classes: "${classList}"`);
            console.log(`  Visible: ${visible}`);
            console.log(`  -> Attempting to click...`);
            
            try {
              await div.click({ timeout: 3000 });
              console.log(`  ✅ Clicked!\n`);
              foundVolume = true;
              await page.waitForTimeout(2000);
              break;
            } catch (e) {
              console.log(`  ❌ Click failed: ${e}\n`);
            }
          }
        } catch (e) {
          // continue
        }
      }
      
      if (!foundVolume) {
        console.log('\n⚠️ Could not find volume option divs\n');
        console.log('Listing all clickable elements on page:');
        
        const allClickables = await page.locator('button, [role="button"], a, div[onclick], label').all();
        console.log(`Total clickable elements: ${allClickables.length}\n`);
        
        for (let i = 0; i < Math.min(allClickables.length, 20); i++) {
          try {
            const text = await allClickables[i].textContent();
            const tagName = await allClickables[i].evaluate(el => el.tagName);
            const visible = await allClickables[i].isVisible().catch(() => false);
            if (text && text.trim()) {
              console.log(`  [${i}] <${tagName}> "${text.trim()}" (visible: ${visible})`);
            }
          } catch (e) {
            // continue
          }
        }
      }
    } else {
      console.log('✅ "2500" is visible on page\n');
      
      // Get the element
      const volume2500 = page.locator('text=2500').first();
      await volume2500.click();
      console.log('✅ Clicked 2500 element\n');
      await page.waitForTimeout(2000);
    }

    // Check for result
    console.log('Checking for result...\n');
    const resultText = await page.textContent('body') || '';
    if (resultText.includes('Shipping by CSX') || resultText.includes('194')) {
      console.log('✅ Result text found!');
      const matches = resultText.match(/Shipping by CSX[^.]*\./);
      if (matches) {
        console.log(`Result: "${matches[0]}"\n`);
      }
    } else {
      console.log('⚠️ Result not found\n');
    }

    // Take screenshot
    await page.screenshot({ path: 'debug-volume-selector.png' });
    console.log('📸 Screenshot saved: debug-volume-selector.png\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('⏳ Browser will stay open for inspection...\n');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

debugVolumeSelector().catch(console.error);
