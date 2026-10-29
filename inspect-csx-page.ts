import { chromium } from '@playwright/test';

/**
 * Reconnaissance script to inspect the CSX Carbon Estimator page
 * and extract actual element selectors from the DOM
 */

async function inspectCSXPage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Navigating to CSX Carbon Estimator...');
    await page.goto('https://www.csx.com/index.cfm/about-us/sustainability/environment/carbon-estimator/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForTimeout(3000);
    
    // Get all images on the page
    console.log('\n📸 IMAGES ON PAGE:');
    const images = await page.locator('img').all();
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      const id = await img.getAttribute('id');
      const className = await img.getAttribute('class');
      console.log(`  Image ${i}:`);
      if (alt) console.log(`    alt: "${alt}"`);
      if (src) console.log(`    src: "${src.substring(0, 80)}..."`);
      if (id) console.log(`    id: "${id}"`);
      if (className) console.log(`    class: "${className}"`);
    }
    
    // Get all buttons on the page
    console.log('\n🔘 BUTTONS ON PAGE:');
    const buttons = await page.locator('button').all();
    for (let i = 0; i < buttons.length && i < 15; i++) {
      const btn = buttons[i];
      const text = await btn.textContent();
      const id = await btn.getAttribute('id');
      const className = await btn.getAttribute('class');
      const type = await btn.getAttribute('type');
      if (text?.trim()) {
        console.log(`  Button ${i}: "${text.trim()}"`);
        if (id) console.log(`    id: "${id}"`);
        if (className) console.log(`    class: "${className}"`);
        if (type) console.log(`    type: "${type}"`);
      }
    }
    
    // Get all select dropdowns
    console.log('\n📋 SELECT DROPDOWNS ON PAGE:');
    const selects = await page.locator('select').all();
    for (let i = 0; i < selects.length; i++) {
      const select = selects[i];
      const id = await select.getAttribute('id');
      const name = await select.getAttribute('name');
      const className = await select.getAttribute('class');
      const options = await select.locator('option').all();
      console.log(`  Select ${i}:`);
      if (id) console.log(`    id: "${id}"`);
      if (name) console.log(`    name: "${name}"`);
      if (className) console.log(`    class: "${className}"`);
      console.log(`    options (${options.length}):`);
      for (let j = 0; j < Math.min(options.length, 5); j++) {
        const optText = await options[j].textContent();
        const optValue = await options[j].getAttribute('value');
        console.log(`      ${j}: "${optText}" (value: "${optValue}")`);
      }
      if (options.length > 5) console.log(`      ... and ${options.length - 5} more options`);
    }
    
    // Get all input fields
    console.log('\n🖊️ INPUT FIELDS ON PAGE:');
    const inputs = await page.locator('input').all();
    for (let i = 0; i < inputs.length && i < 10; i++) {
      const input = inputs[i];
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`  Input ${i}:`);
      if (id) console.log(`    id: "${id}"`);
      if (name) console.log(`    name: "${name}"`);
      if (type) console.log(`    type: "${type}"`);
      if (placeholder) console.log(`    placeholder: "${placeholder}"`);
    }
    
    // Look for divs with specific classes
    console.log('\n📦 MAIN CONTAINERS:');
    const containers = await page.locator('[class*="container"], [class*="form"], [class*="section"]').all();
    for (let i = 0; i < containers.length && i < 8; i++) {
      const container = containers[i];
      const className = await container.getAttribute('class');
      const id = await container.getAttribute('id');
      const text = await container.textContent();
      if (className) {
        console.log(`  Container ${i}:`);
        console.log(`    class: "${className}"`);
        if (id) console.log(`    id: "${id}"`);
        console.log(`    text preview: "${(text || '').substring(0, 50)}..."`);
      }
    }
    
    // Get text content of page to understand structure
    console.log('\n📄 PAGE TITLE AND HEADERS:');
    const title = await page.title();
    console.log(`  Page Title: "${title}"`);
    
    const h1 = await page.locator('h1').first().textContent().catch(() => null);
    if (h1) console.log(`  H1: "${h1}"`);
    
    const h2s = await page.locator('h2').allTextContents();
    h2s.forEach((h2, i) => {
      if (i < 5) console.log(`  H2 ${i}: "${h2}"`);
    });
    
    // Look for the specific goods selection area
    console.log('\n🏷️ LOOKING FOR GOODS SELECTION:');
    const goodsLabels = await page.locator('text=/goods|commodity|freight type/i').allTextContents();
    console.log(`  Found ${goodsLabels.length} text matches for goods/commodity`);
    goodsLabels.forEach((label, i) => {
      if (i < 3) console.log(`    "${label}"`);
    });
    
    console.log('\n✅ Inspection complete! Check the visible browser window for visual confirmation.');
    console.log('   The browser will stay open for 60 seconds - inspect the UI directly.');
    
    // Keep browser open for inspection
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ Error during inspection:', error);
  } finally {
    await browser.close();
  }
}

inspectCSXPage().catch(console.error);
