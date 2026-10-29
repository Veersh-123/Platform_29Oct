import { chromium } from '@playwright/test';

/**
 * Deep UI Inspection Script - Phase 2
 * 
 * Finds remaining locators:
 * - Freight Volume input/dropdown
 * - Calculate/Estimate button
 * - Results section
 */

async function deepInspection() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔍 PHASE 2: Deep UI Inspection - Finding Freight Volume & Calculate Button');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Navigate and setup
    await page.goto('https://www.csx.com/index.cfm/about-us/sustainability/environment/carbon-estimator/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded\n');

    // Step 1: Click Groceries
    console.log('📍 Step 1: Click Groceries');
    console.log('  Trying selector: #carbon_b1 (Groceries ID from DOM)\n');
    const groceries = page.locator('#carbon_b1');
    await groceries.click({ timeout: 5000 });
    console.log('✅ Groceries clicked\n');
    await page.waitForTimeout(1000);

    // Step 2: Select Start City
    console.log('📍 Step 2: Select Birmingham as Start City');
    await page.locator('select#carbon_basic_start').selectOption('3');
    console.log('✅ Birmingham selected\n');
    await page.waitForTimeout(500);

    // Step 3: Select End City
    console.log('📍 Step 3: Select Boston as End City');
    await page.locator('select#carbon_basic_end').selectOption('4');
    console.log('✅ Boston selected\n');
    await page.waitForTimeout(500);

    // Step 4: Find and fill Freight Volume
    console.log('📍 Step 4: Find Freight Volume Input/Dropdown');
    
    // Get all inputs and their details
    const allInputs = page.locator('input, select, textarea');
    const inputCount = await allInputs.count();
    console.log(`Total input elements: ${inputCount}\n`);
    
    console.log('🔎 Searching for Freight Volume input...\n');
    
    // Check for specific input by ID
    const tonsInput = page.locator('input#total_tons');
    const tonsExists = await tonsInput.count().then(c => c > 0);
    console.log(`input#total_tons exists: ${tonsExists}`);
    
    // Look for all visible inputs
    const visibleInputs = await page.locator('input[type="text"], input:not([type])').all();
    console.log(`Visible text inputs: ${visibleInputs.length}`);
    
    for (let i = 0; i < Math.min(visibleInputs.length, 5); i++) {
      try {
        const placeholder = await visibleInputs[i].getAttribute('placeholder');
        const id = await visibleInputs[i].getAttribute('id');
        const name = await visibleInputs[i].getAttribute('name');
        const value = await visibleInputs[i].inputValue();
        console.log(`  Input ${i}: id="${id}", name="${name}", placeholder="${placeholder}", value="${value}"`);
      } catch (e) {
        console.log(`  Input ${i}: (error reading attributes)`);
      }
    }
    
    // Look for select dropdowns specifically
    const selectDropdowns = page.locator('select');
    const selectCount = await selectDropdowns.count();
    console.log(`\nTotal SELECT dropdowns: ${selectCount}`);
    
    const selects = await selectDropdowns.all();
    for (let i = 0; i < Math.min(selects.length, 10); i++) {
      try {
        const id = await selects[i].getAttribute('id');
        const name = await selects[i].getAttribute('name');
        const optionCount = await selects[i].locator('option').count();
        console.log(`  SELECT ${i}: id="${id}", name="${name}", options=${optionCount}`);
      } catch (e) {
        console.log(`  SELECT ${i}: (error reading)`);
      }
    }
    
    // Step 5: Find Calculate Button
    console.log('\n📍 Step 5: Find Calculate/Submit Button');
    
    // Get all buttons
    const allButtons = page.locator('button, input[type="button"], input[type="submit"]');
    const buttonCount = await allButtons.count();
    console.log(`Total buttons: ${buttonCount}\n`);
    
    console.log('🔎 Searching for Calculate button...\n');
    
    const buttons = await allButtons.all();
    for (let i = 0; i < Math.min(buttons.length, 15); i++) {
      try {
        const text = await buttons[i].textContent();
        const value = await buttons[i].getAttribute('value');
        const type = await buttons[i].getAttribute('type');
        const id = await buttons[i].getAttribute('id');
        const visible = await buttons[i].isVisible().catch(() => false);
        console.log(`  Button ${i}: text="${text}", value="${value}", type="${type}", id="${id}", visible=${visible}`);
      } catch (e) {
        console.log(`  Button ${i}: (error reading)`);
      }
    }

    // Try to fill freight volume if input exists
    console.log('\n📍 Step 6: Attempt to Fill Freight Volume');
    
    // Try multiple selectors
    const freightSelectors = [
      'input#total_tons',
      'input[name*="tons"]',
      'input[id*="tons"]',
      'input[placeholder*="tons" i]',
      'input[placeholder*="freight" i]',
      'input[placeholder*="volume" i]',
      'select:nth-of-type(3)',
      'select:nth-of-type(4)',
    ];
    
    let freightFound = false;
    for (const selector of freightSelectors) {
      try {
        const element = page.locator(selector).first();
        const exists = await element.count().then(c => c > 0);
        if (exists) {
          const tagName = await element.evaluate(el => el.tagName);
          console.log(`  Found with selector "${selector}": ${tagName}`);
          
          if (tagName === 'SELECT') {
            const options = await element.locator('option').count();
            console.log(`    Options: ${options}`);
            // Try to select an option containing "2500"
            const optionElements = await element.locator('option').all();
            for (const opt of optionElements) {
              const text = await opt.textContent();
              if (text && text.includes('2500')) {
                await element.selectOption(text);
                console.log(`    ✅ Selected option: ${text}`);
                freightFound = true;
                break;
              }
            }
          } else if (tagName === 'INPUT') {
            await element.fill('2500');
            console.log(`    ✅ Filled value: 2500`);
            freightFound = true;
          }
          if (freightFound) break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!freightFound) {
      console.log('  ⚠️ Could not find or fill Freight Volume');
    }
    
    await page.waitForTimeout(1000);

    // Step 7: Click Calculate Button
    console.log('\n📍 Step 7: Click Calculate Button');
    
    const calcSelectors = [
      'button:has-text("Calculate")',
      'button:has-text("Estimate")',
      'button:has-text("Submit")',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:nth-of-type(3)',
      'button[id*="calc"]',
      'button[id*="submit"]',
    ];
    
    let calcClicked = false;
    for (const selector of calcSelectors) {
      try {
        const element = page.locator(selector).first();
        const exists = await element.count().then(c => c > 0);
        const visible = exists ? await element.isVisible().catch(() => false) : false;
        
        if (exists && visible) {
          const text = await element.textContent();
          console.log(`  Found with selector "${selector}": "${text}"`);
          await element.click({ timeout: 5000 });
          console.log(`  ✅ Clicked!`);
          calcClicked = true;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!calcClicked) {
      console.log('  ⚠️ Could not click Calculate button');
    }
    
    await page.waitForTimeout(3000);

    // Step 8: Check Results
    console.log('\n📍 Step 8: Check Results Section');
    
    const resultText = await page.textContent('body').catch(() => null) || '';
    if (resultText.includes('ton') || resultText.includes('Ton') || resultText.includes('emission')) {
      console.log('  ✅ Result text found on page');
      const matches = resultText.match(/\d+(\.\d+)?\s*(ton|Ton|CO2|Emission)/gi);
      if (matches) {
        console.log('  Found result values:', matches.slice(0, 5));
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'deep-inspection-screenshot.png' });
    console.log('\n📸 Screenshot saved: deep-inspection-screenshot.png');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ DEEP INSPECTION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('⏳ Browser will stay open for 60 seconds for manual inspection...\n');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error during deep inspection:', error);
  } finally {
    await browser.close();
    console.log('✅ Browser closed');
  }
}

deepInspection().catch(console.error);
