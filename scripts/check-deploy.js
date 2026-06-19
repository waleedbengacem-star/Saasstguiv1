const http = require('https');

function getUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ body: data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function verifyDeploy() {
  console.log('Fetching main login page...');
  const { body: html } = await getUrl('https://holiday-homes-saas.vercel.app/login');
  
  // Find all NextJS chunks in html
  const scriptRegex = /src="(\/_next\/static\/chunks\/[^"]+\.js)"/g;
  let match;
  const scriptUrls = [];
  while ((match = scriptRegex.exec(html)) !== null) {
    scriptUrls.push('https://holiday-homes-saas.vercel.app' + match[1]);
  }
  
  console.log(`Found ${scriptUrls.length} script chunks. Searching for new translations...`);
  
  for (const url of scriptUrls) {
    try {
      const { body: js } = await getUrl(url);
      if (js.includes('"1 booking"') || js.includes('1 booking') || js.includes('1 件 of 予約')) {
        console.log(`FOUND new translations in: ${url}`);
        return true;
      }
    } catch (err) {
      console.error(`Error reading ${url}:`, err.message);
    }
  }
  
  console.log('New translations NOT found in JS bundles yet.');
  return false;
}

verifyDeploy().then(isLive => {
  process.exit(isLive ? 0 : 1);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
