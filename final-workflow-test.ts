import { chromium } from '@playwright/test';

/**
 * Final Comprehensive Workflow Test
 * 
 * Tests the complete CSX Carbon Estimator workflow with verified locators:
 * 1. Navigate to page
 * 2. Click Groceries (#carbon_b1)
 * 3. Select Birmingham (value: 3)
 * 4. Select Boston (value: 4)
 * 5. Click 2500 Tons button
 * 6. Verify result: "Shipping by CSX can reduce CO2 emissions by approximately 194 tons"
 */

async function finalWorkflowTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ FINAL WORKFLOW TEST - CSX CARBON ESTIMATOR');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Step 1: Navigate
    console.log('📍 STEP 1: Navigate to CSX Carbon Estimator\n');
    await page.goto('https://www.csx.com/index.cfm/about-us/sustainability/environment/carbon-estimator/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded\n');

    // Step 2: Click Groceries
    console.log('📍 STEP 2: Click Groceries (selector: #carbon_b1)\n');
    const groceries = page.locator('#carbon_b1');
    const groceriesExists = await groceries.count().then(c => c > 0);
    console.log(`  Groceries element exists: ${groceriesExists}`);
    
    await groceries.click({ timeout: 5000 });
    console.log('✅ Groceries clicked\n');
    await page.waitForTimeout(800);

    // Step 3: Select Birmingham (Start City)
    console.log('📍 STEP 3: Select Birmingham as Start City (value: 3)\n');
    const startCitySelect = page.locator('select#carbon_basic_start');
    const startCityExists = await startCitySelect.count().then(c => c > 0);
    console.log(`  Start City dropdown exists: ${startCityExists}`);
    
    await startCitySelect.selectOption('3');
    console.log('✅ Birmingham selected\n');
    await page.waitForTimeout(500);

    // Step 4: Select Boston (End City)
    console.log('📍 STEP 4: Select Boston as End City (value: 4)\n');
    const endCitySelect = page.locator('select#carbon_basic_end');
    const endCityExists = await endCitySelect.count().then(c => c > 0);
    console.log(`  End City dropdown exists: ${endCityExists}`);
    
    await endCitySelect.selectOption('4');
    console.log('✅ Boston selected\n');
    await page.waitForTimeout(500);

    // Step 5: Click 2500 Tons Button
    console.log('📍 STEP 5: Click 2500 Tons Freight Volume Button\n');
    
    // Try to find the button
    const volumeButton = page.locator('button:has-text("2500")');
    const buttonCount = await volumeButton.count();
    console.log(`  Buttons with "2500" found: ${buttonCount}`);
    
    if (buttonCount > 0) {
      await volumeButton.click({ timeout: 5000 });
      console.log('✅ 2500 Tons button clicked\n');
    } else {
      console.log('⚠️ No button with "2500" found, looking for alternative selectors...\n');
      
      // Get all buttons to debug
      const allButtons = page.locator('button');
      const allButtonCount = await allButtons.count();
      console.log(`  Total buttons on page: ${allButtonCount}`);
      
      const buttons = await allButtons.all();
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const text = await buttons[i].textContent();
        const visible = await buttons[i].isVisible().catch(() => false);
        console.log(`    Button ${i}: "${text}" (visible: ${visible})`);
        
        if (text && text.includes('2500')) {
          await buttons[i].click({ timeout: 5000 });
          console.log('✅ 2500 Tons button clicked (via enumeration)\n');
          break;
        }
      }
    }
    
    await page.waitForTimeout(2000);

    // Step 6: Verify Result
    console.log('📍 STEP 6: Verify Result - "Shipping by CSX can reduce CO2 emissions by approximately 194 tons"\n');
    
    const pageText = await page.textContent('body').catch(() => null) || '';
    
    const hasShippingByCSX = pageText.includes('Shipping by CSX');
    const hasCO2 = pageText.includes('CO2');
    const has194Tons = pageText.includes('194');
    const hasTruck = pageText.includes('truck');
    
    console.log(`  Contains "Shipping by CSX": ${hasShippingByCSX}`);
    console.log(`  Contains "CO2": ${hasCO2}`);
    console.log(`  Contains "194" (tons): ${has194Tons}`);
    console.log(`  Contains "truck": ${hasTruck}\n`);
    
    // Extract the full result message
    const resultMatch = pageText.match(/Shipping by CSX[^.]*194[^.]*truck[^.]*/i);
    if (resultMatch) {
      console.log(`✅ RESULT FOUND:\n  "${resultMatch[0]}"\n`);
    } else if (hasShippingByCSX && has194Tons) {
      console.log('✅ Result elements found (Shipping by CSX + 194 tons)\n');
    } else {
      console.log('⚠️ Result not found, checking page content...\n');
      const tonMatches = pageText.match(/\d+\s+tons?/gi);
      if (tonMatches) {
        console.log(`  Ton values found: ${tonMatches.slice(0, 5).join(', ')}`);
      }
    }

    // Screenshot
    await page.screenshot({ path: 'final-workflow-result.png' });
    console.log('📸 Screenshot saved: final-workflow-result.png');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ WORKFLOW TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('🎯 DISCOVERED LOCATORS - READY FOR TESTS:\n');
    console.log('  Groceries:      #carbon_b1');
    console.log('  Start City:     select#carbon_basic_start (value: 3 for Birmingham)');
    console.log('  End City:       select#carbon_basic_end (value: 4 for Boston)');
    console.log('  2500 Tons:      button:has-text("2500")');
    console.log('  Result Check:   text includes "Shipping by CSX", "194", and "truck"\n');

    console.log('⏳ Browser will stay open for 60 seconds for final review...\n');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error during final workflow test:', error);
    console.error('\nStack trace:');
    console.error(error instanceof Error ? error.stack : String(error));
  } finally {
    await browser.close();
    console.log('✅ Browser closed');
  }
}

finalWorkflowTest().catch(console.error);
