const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Navigate to the app
  console.log('Navigating to http://localhost:3001...');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });

  // Wait a bit for React to render
  await page.waitForTimeout(2000);

  // Take screenshot of landing page
  await page.screenshot({ path: '/tmp/landing-page.png', fullPage: true });
  console.log('Screenshot saved: /tmp/landing-page.png');

  // Check what's on the page
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== PAGE TEXT ===');
  console.log(bodyText.substring(0, 500));

  // Check for login button
  const hasLoginButton = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some(btn => btn.innerText.toLowerCase().includes('login'));
  });
  console.log('\n=== HAS LOGIN BUTTON:', hasLoginButton);

  // Check for wallet address in header
  const headerText = await page.evaluate(() => {
    const header = document.querySelector('header') || document.querySelector('nav');
    return header ? header.innerText : 'No header found';
  });
  console.log('\n=== HEADER TEXT ===');
  console.log(headerText);

  // Navigate to voting page
  console.log('\n=== NAVIGATING TO /voting ===');
  await page.goto('http://localhost:3001/voting', { waitUntil: 'networkidle0' });
  await page.waitForTimeout(2000);

  // Take screenshot of voting page
  await page.screenshot({ path: '/tmp/voting-page.png', fullPage: true });
  console.log('Screenshot saved: /tmp/voting-page.png');

  // Check for "Create New Poll" button
  const hasCreatePollButton = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('Create New Poll') || text.includes('Create Poll');
  });
  console.log('\n=== HAS CREATE POLL BUTTON:', hasCreatePollButton);

  // Get all button texts
  const buttonTexts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(btn => btn.innerText.trim()).filter(t => t);
  });
  console.log('\n=== ALL BUTTONS ON PAGE ===');
  console.log(buttonTexts);

  // Navigate to create poll page
  console.log('\n=== NAVIGATING TO /create-poll ===');
  await page.goto('http://localhost:3001/create-poll', { waitUntil: 'networkidle0' });
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: '/tmp/create-poll-page.png', fullPage: true });
  console.log('Screenshot saved: /tmp/create-poll-page.png');

  const createPollText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== CREATE POLL PAGE TEXT ===');
  console.log(createPollText.substring(0, 500));

  console.log('\n=== DONE ===');
  console.log('Check screenshots at:');
  console.log('  /tmp/landing-page.png');
  console.log('  /tmp/voting-page.png');
  console.log('  /tmp/create-poll-page.png');

  // Keep browser open for inspection
  console.log('\nBrowser will stay open for 30 seconds...');
  await page.waitForTimeout(30000);

  await browser.close();
})();
