const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 1. Static file server
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(8099, async () => {
  console.log('HTTP Server listening on port 8099');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.join(process.cwd(), '.chrome_test_profile');

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
    'http://localhost:8099/index.html'
  ]);

  // Wait for remote debugging endpoint
  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch('http://127.0.0.1:9223/json/list');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('8099'));
    if (!pageTab) throw new Error('Could not find opened tab');

    console.log('Connecting to WebSocket:', pageTab.webSocketDebuggerUrl);
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let id = 1;
    const pending = new Map();
    const consoleLogs = [];

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
      if (data.method === 'Runtime.consoleAPICalled') {
        const text = (data.params.args || []).map(a => a.value || JSON.stringify(a)).join(' ');
        consoleLogs.push(`[${data.params.type}] ${text}`);
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('Browser Exception:', data.params.exceptionDetails);
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

    // Wait 1.5s for page script execution
    await new Promise(r => setTimeout(r, 1500));

    console.log('\n--- Evaluating View Switching and DOM hierarchy ---');
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const results = {};
        
        const main = document.querySelector('main.main-container');
        const citations = document.getElementById('view-citations');
        const panna = document.getElementById('view-panna');

        results.mainExists = !!main;
        results.citationsExists = !!citations;
        results.pannaExists = !!panna;

        // Verify hierarchy: panna MUST be direct child of main, NOT inside citations!
        results.pannaParentIsMain = (panna.parentElement === main);
        results.pannaInsideCitations = citations.contains(panna);

        // Switch to panna view
        window.samadhiApp.switchView('panna');

        const pannaStyle = window.getComputedStyle(panna);
        const citationsStyle = window.getComputedStyle(citations);

        results.pannaDisplay = pannaStyle.display;
        results.citationsDisplay = citationsStyle.display;
        results.pannaBoundingHeight = panna.getBoundingClientRect().height;
        results.pannaActive = panna.classList.contains('active');

        // Check tabs
        const tabContent = document.getElementById('panna-tab-content');
        results.hasTabContent = !!tabContent && tabContent.children.length > 0;

        return results;
      })()`,
      returnByValue: true
    });

    console.log('DOM Evaluation Result:', evalRes.result.value);

    // Test sub-tabs
    console.log('\n--- Testing Paññā Sub-Tabs ---');
    for (const tabKey of ['rupa28', 'namaSummary', 'similes', 'vipassanaSteps']) {
      const tabEval = await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.querySelector('[data-panna-tab="${tabKey}"]');
          if (btn) btn.click();
          const tabContent = document.getElementById('panna-tab-content');
          return {
            tab: "${tabKey}",
            btnFound: !!btn,
            btnActive: btn ? btn.classList.contains('active') : false,
            contentLength: tabContent ? tabContent.innerHTML.length : 0,
            citationLinks: Array.from(tabContent.querySelectorAll('a[href*="tripitaka82.com"]')).map(a => a.href)
          };
        })()`,
        returnByValue: true
      });
      console.log(`Tab [${tabKey}]:`, {
        tab: tabEval.result.value.tab,
        btnActive: tabEval.result.value.btnActive,
        contentLength: tabEval.result.value.contentLength,
        citationCount: tabEval.result.value.citationLinks.length
      });
    }

    // Take screenshot
    console.log('\n--- Capturing Screenshot ---');
    const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshotRes.data, 'base64');
    fs.writeFileSync('scripts/panna_tab_screenshot.png', buffer);
    console.log('Screenshot saved to scripts/panna_tab_screenshot.png (' + buffer.length + ' bytes)');

    ws.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    chromeProc.kill();
    server.close();
    // clean up user data dir
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {}
    console.log('Test completed.');
  }
});
