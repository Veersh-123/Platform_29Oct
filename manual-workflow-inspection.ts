import { chromium } from '@playwright/test';

/**
 * Manual Workflow Inspection Script
 * 
 * Walks through the CSX Carbon Estimator workflow step-by-step
 * and identifies the correct locators for each interaction
 */

async function inspectWorkflow() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔍 CSX CARBON ESTIMATOR - MANUAL WORKFLOW INSPECTION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Step 1: Navigate to CSX Carbon Estimator URL
    console.log('📍 STEP 1: Navigate to CSX Carbon Estimator URL');
    console.log('URL: https://www.csx.com/index.cfm/about-us/sustainability/environment/carbon-estimator/\n');
    
    await page.goto('https://www.csx.com/index.cfm/about-us/sustainability/environment/carbon-estimator/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded successfully\n');

    // Step 2: Locate Goods Section
    console.log('📍 STEP 2: Locate Goods Section and Available Categories');
    console.log('Looking for Groceries, Bricks, Electronics, Rubber...\n');
    
    const goodsSection = page.locator('[class*="step1"], [class*="goods"], [id*="goods"]').first();
    const goodsVisible = await goodsSection.isVisible().catch(() => false);
    console.log(`Goods section visible: ${goodsVisible}`);
    
    // Find all images that might represent goods
    const allImages = page.locator('img');
    const imageCount = await allImages.count();
    console.log(`Total images on page: ${imageCount}\n`);
    
    // Look for clickable elements or buttons containing the goods
    const clickables = page.locator('button, div[role="button"], li, [class*="commodity"]');
    const clickableCount = await clickables.count();
    console.log(`Clickable elements found: ${clickableCount}`);
    console.log(`\nSearching for goods-related clickable elements...\n`);
    
    // Try to find groceries specifically
    console.log('🔎 Searching for Groceries element...');
    try {
      const groceriesBtn = page.locator('button:has-text("Groceries"), label:has-text("Groceries"), li:has(img[alt*="Grocer"]), div:has(img[src*="grocer" i])').first();
      const groceriesExists = await groceriesBtn.isVisible().catch(() => false);
      if (groceriesExists) {
        console.log('✅ Found Groceries element!');
        const boundingBox = await groceriesBtn.boundingBox();
        console.log(`  Position: ${JSON.stringify(boundingBox)}`);
      }
    } catch (e) {
      console.log('ℹ️ Groceries element not found with primary selectors');
    }

    // Step 3: Click on Groceries
    console.log('\n📍 STEP 3: Click on Groceries Image/Card');
    
    // Try different selectors
    const selectors = [
      'button:has(img[src*="carbon_goods"])',
      'li:has(img)',
      'div[class*="goods"]:nth-of-type(1)',
      'label:first-of-type',
      'button:first-of-type:has(img)'
    ];
    
    let groceriesClicked = false;
    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        const count = await element.count();
        if (count > 0) {
          console.log(`  Trying selector: ${selector}`);
          await element.click({ timeout: 3000 });
          console.log(`  ✅ Clicked successfully with selector: ${selector}`);
          groceriesClicked = true;
          break;
        }
      } catch (e) {
        console.log(`  ❌ Selector failed: ${selector}`);
      }
    }
    
    if (!groceriesClicked) {
      console.log('  ⚠️ Groceries click may not have worked, continuing...');
    }

    await page.waitForTimeout(1000);

    // Step 4: Verify Distance Section
    console.log('\n📍 STEP 4: Verify Distance Section is Displayed');
    const distanceSection = page.locator('[class*="distance"], [id*="distance"], text=/distance|route/i').first();
    const distanceVisible = await distanceSection.isVisible().catch(() => false);
    console.log(`Distance section visible: ${distanceVisible}`);

    // Step 5: Click Start City Dropdown
    console.log('\n📍 STEP 5: Click on Start City Dropdown');
    
    const startCitySelect = page.locator('select#carbon_basic_start');
    const startCityVisible = await startCitySelect.isVisible().catch(() => false);
    console.log(`Start City dropdown found: ${startCityVisible}`);
    
    if (startCityVisible) {
      await startCitySelect.click();
      console.log('✅ Clicked Start City dropdown');
    }

    await page.waitForTimeout(500);

    // Step 6: Select Birmingham
    console.log('\n📍 STEP 6: Select Birmingham from Start City Dropdown');
    
    try {
      await startCitySelect.selectOption('3'); // Birmingham value = 3
      console.log('✅ Selected Birmingham (value: 3)');
    } catch (e) {
      console.log(`❌ Error selecting Birmingham: ${e}`);
    }

    await page.waitForTimeout(500);

    // Step 7: Click End City Dropdown
    console.log('\n📍 STEP 7: Click on End City Dropdown');
    
    const endCitySelect = page.locator('select#carbon_basic_end');
    const endCityVisible = await endCitySelect.isVisible().catch(() => false);
    console.log(`End City dropdown found: ${endCityVisible}`);
    
    if (endCityVisible) {
      await endCitySelect.click();
      console.log('✅ Clicked End City dropdown');
    }

    await page.waitForTimeout(500);

    // Step 8: Select Boston
    console.log('\n📍 STEP 8: Select Boston from End City Dropdown');
    
    try {
      await endCitySelect.selectOption('4'); // Boston value = 4
      console.log('✅ Selected Boston (value: 4)');
    } catch (e) {
      console.log(`❌ Error selecting Boston: ${e}`);
    }

    await page.waitForTimeout(500);

    // Step 9: Click Freight Volume Dropdown/Input
    console.log('\n📍 STEP 9: Select Freight Volume (2500 Tons)');
    
    const freightInput = page.locator('input#total_tons');
    const freightVisible = await freightInput.isVisible().catch(() => false);
    console.log(`Freight Volume input found: ${freightVisible}`);
    
    if (freightVisible) {
      await freightInput.fill('2500');
      console.log('✅ Entered 2500 Tons');
    }

    await page.waitForTimeout(500);

    // Step 10: Click Calculate Button
    console.log('\n📍 STEP 10: Click Calculate/Estimate Button');
    
    const calculateBtn = page.locator('button:has-text("Calculate"), button:has-text("Estimate"), button[type="submit"], input[type="button"]').first();
    const calcVisible = await calculateBtn.isVisible().catch(() => false);
    console.log(`Calculate button found: ${calcVisible}`);
    
    if (calcVisible) {
      await calculateBtn.click();
      console.log('✅ Clicked Calculate button');
    }

    await page.waitForTimeout(3000);

    // Step 11: Wait for Results
    console.log('\n📍 STEP 11: Wait for Results Section');
    
    const resultSection = page.locator('[class*="result"], [id*="result"], text=/emission|result|carbon/i').first();
    const resultVisible = await resultSection.isVisible().catch(() => false);
    console.log(`Results section visible: ${resultVisible}`);

    // Step 12: Verify Carbon Emission Value
    console.log('\n📍 STEP 12: Verify Calculated Carbon Emission Value');
    
    const resultValue = await page.locator('[class*="result"] span, [id*="result"] span, text=/\\d+\\s*Tons/').first().textContent().catch(() => null);
    console.log(`Result value: ${resultValue || '(not found)'}`);

    // Screenshot for verification
    await page.screenshot({ path: 'workflow-screenshot.png' });
    console.log('\n📸 Screenshot saved: workflow-screenshot.png');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ WORKFLOW INSPECTION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📋 DISCOVERED LOCATORS:');
    console.log('  Start City:     select#carbon_basic_start');
    console.log('  End City:       select#carbon_basic_end');
    console.log('  Freight Volume: input#total_tons');
    console.log('  Calculate Btn:  button[type="submit"], button:has-text("Calculate")');
    console.log('\n🔍 Still to determine: Exact Goods selector (image/button/label)\n');

    // Keep browser open for manual inspection
    console.log('⏳ Browser will stay open for 60 seconds for manual inspection...');
    console.log('📌 Inspect the Goods section manually to identify the clickable element!\n');
    
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error during workflow:', error);
  } finally {
    await browser.close();
    console.log('✅ Browser closed');
  }
}

inspectWorkflow().catch(console.error);
