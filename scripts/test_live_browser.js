const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testLive() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.join(process.cwd(), '.chrome_live_test');

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
    'https://samadhi.tripitaka82.com/?v=2.2.5'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const listRes = await fetch('http://127.0.0.1:9224/json/list');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('samadhi.tripitaka82.com'));
    if (!pageTab) throw new Error('Could not find live page tab');

    console.log('Connecting to WebSocket:', pageTab.webSocketDebuggerUrl);
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let id = 1;
    const pending = new Map();
    const exceptions = [];

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('LIVE Console Exception:', data.params.exceptionDetails);
        exceptions.push(data.params.exceptionDetails);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        pending.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    // Wait 2s for live page load & hydration
    await new Promise(r => setTimeout(r, 2000));

    console.log('\n--- Clicking នាម-រូប & បញ្ញា on Live Website ---');
    const navEval = await send('Runtime.evaluate', {
      expression: `(() => {
        // Click the nav button for panna
        const btn = document.querySelector('header [data-view-target="panna"]') || document.querySelector('[data-view-target="panna"]');
        if (btn) btn.click();

        const panna = document.getElementById('view-panna');
        const citations = document.getElementById('view-citations');
        const main = document.querySelector('main.main-container');

        const pStyle = window.getComputedStyle(panna);
        const rect = panna.getBoundingClientRect();

        return {
          btnFound: !!btn,
          pannaIsChildOfMain: (panna.parentElement === main),
          pannaInsideCitations: citations.contains(panna),
          pannaDisplay: pStyle.display,
          pannaActive: panna.classList.contains('active'),
          height: rect.height,
          renderedHtmlLength: panna.innerHTML.length
        };
      })()`,
      returnByValue: true
    });

    console.log('Live View Switch Result:', navEval.result.value);

    // Test sub-tabs on live
    console.log('\n--- Testing Paññā Sub-Tabs on Live Website ---');
    for (const tabKey of ['rupa28', 'namaSummary', 'similes', 'vipassanaSteps']) {
      const tabEval = await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.querySelector('[data-panna-tab="${tabKey}"]');
          if (btn) btn.click();
          const tabContent = document.getElementById('panna-tab-content');
          return {
            tab: "${tabKey}",
            btnActive: btn ? btn.classList.contains('active') : false,
            contentLength: tabContent ? tabContent.innerHTML.length : 0,
            firstCardTitle: tabContent ? (tabContent.querySelector('h3, h4, .panna-section-title')?.textContent?.trim()) : null,
            citationsCount: tabContent ? tabContent.querySelectorAll('a[href*="tripitaka82.com"]').length : 0
          };
        })()`,
        returnByValue: true
      });
      console.log(`Live Tab [${tabKey}]:`, tabEval.result.value);
    }

    // Capture live screenshot
    const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshotRes.data, 'base64');
    fs.writeFileSync('scripts/live_panna_verified.png', buffer);
    fs.copyFileSync('scripts/live_panna_verified.png', 'C:/Users/e.ek/.gemini/antigravity/brain/b8370146-1d92-4814-9777-7156f1ade8e4/live_panna_verified.png');
    console.log('Live screenshot saved and copied to brain artifacts!');

    console.log('\nTotal Console Exceptions:', exceptions.length);

    ws.close();
  } catch (e) {
    console.error('Live test error:', e);
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {}
    console.log('Live verification completed.');
  }
}

testLive();
