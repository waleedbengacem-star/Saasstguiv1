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

async function checkSettingsChunk() {
  console.log('Fetching main login page to find build ID...');
  const { body: html } = await getUrl('https://holiday-homes-saas.vercel.app/login');
  
  // Extract build ID
  const buildIdMatch = /"buildId":"([^"]+)"/.exec(html);
  if (!buildIdMatch) {
    console.error('Could not find Next.js buildId in HTML.');
    process.exit(1);
  }
  const buildId = buildIdMatch[1];
  console.log(`Found build ID: ${buildId}`);
  
  // Fetch build manifest
  const manifestUrl = `https://holiday-homes-saas.vercel.app/_next/static/${buildId}/_buildManifest.js`;
  console.log(`Fetching build manifest: ${manifestUrl}`);
  const { body: manifest } = await getUrl(manifestUrl);
  
  // Find settings page chunks
  // The manifest contains paths like: "/dashboard/settings": ["static/chunks/...", ...]
  // Let's search for setting chunks
  const chunkRegex = /"static\/chunks\/[^"]+\.js"/g;
  let match;
  const chunks = [];
  while ((match = chunkRegex.exec(manifest)) !== null) {
    chunks.push(match[0].replace(/"/g, ''));
  }
  
  console.log(`Found ${chunks.length} total chunks in manifest. Searching settings chunks...`);
  
  // Let's search for chunk files containing 'settings' or fetch setting page chunks
  // In Next.js, settings chunk often has 'settings' in its name or is dynamic
  const settingsChunks = chunks.filter(c => c.includes('settings') || c.includes('page') || c.includes('app/dashboard/settings'));
  
  if (settingsChunks.length === 0) {
    // If not named explicitly, fetch all chunks to be safe
    console.log('No explicitly named settings chunks. Scanning all app chunks...');
    settingsChunks.push(...chunks.filter(c => c.includes('pages/') || c.includes('chunks/app/')));
  }
  
  console.log(`Scanning ${settingsChunks.length} candidate chunks for "Manual Sync"...`);
  for (const chunkPath of settingsChunks) {
    const url = `https://holiday-homes-saas.vercel.app/_next/static/${chunkPath}`;
    try {
      const { body: js } = await getUrl(url);
      if (js.includes('Manual Sync') || js.includes('Auto Sync')) {
        console.log(`FOUND new settings code in chunk: ${url}`);
        return true;
      }
    } catch (e) {
      // ignore
    }
  }
  
  console.log('The settings chunks on the live site do NOT contain the new "Manual Sync" / "Auto Sync" code yet.');
  return false;
}

checkSettingsChunk().then(isLive => {
  process.exit(isLive ? 0 : 1);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
