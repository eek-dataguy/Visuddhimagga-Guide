const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function verify() {
  console.log('Checking live deployment: https://samadhi.tripitaka82.com/?v=2.2.5');
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const res = await fetchUrl('https://samadhi.tripitaka82.com/?v=2.2.5&t=' + Date.now());
      if (res.body.includes('v=2.2.5') && res.body.includes('</section>\r\n\r\n    <!-- 10. PAÑÑĀ') || res.body.includes('</section>\n\n    <!-- 10. PAÑÑĀ')) {
        console.log(`Attempt ${attempt}: DEPLOYED SUCCESSFULLY! Version 2.2.5 is live.`);
        return true;
      } else {
        console.log(`Attempt ${attempt}: Still waiting for Vercel build to complete... (status ${res.status})`);
      }
    } catch (e) {
      console.log(`Attempt ${attempt} error:`, e.message);
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  return false;
}

verify();
