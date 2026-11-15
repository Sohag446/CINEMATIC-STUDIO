const https = require('https');
const { execSync } = require('child_process');

function getGitHubToken() {
  try {
    const creds = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8'
    });
    const match = creds.match(/password=(.+)/);
    return match ? match[1].trim() : null;
  } catch (e) {
    console.error('Credential error:', e.message);
    return null;
  }
}

function fetchJson(url, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'Node.js' };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const token = getGitHubToken();
  console.log('Authenticated:', !!token);

  console.log('\n--- FETCHING RELEASE v4.0.1 ---');
  const rel = await fetchJson('https://api.github.com/repos/Sohag446/CINEMATIC-STUDIO/releases/tags/v4.0.1', token);
  console.log('Release ID:', rel.id);
  console.log('Release Name:', rel.name);
  console.log('Tag Name:', rel.tag_name);
  console.log('Target Commitish:', rel.target_commitish);
  console.log('Published At:', rel.published_at);
  console.log('HTML URL:', rel.html_url);
  console.log('Assets Count:', rel.assets ? rel.assets.length : 0);
  if (rel.assets) {
    rel.assets.forEach(a => {
      console.log(`- Asset ID: ${a.id} | Name: ${a.name} | Size: ${a.size} bytes | Downloads: ${a.download_count} | Updated: ${a.updated_at} | URL: ${a.browser_download_url}`);
    });
  }

  console.log('\n--- LATEST WORKFLOW RUNS ---');
  const runs = await fetchJson('https://api.github.com/repos/Sohag446/CINEMATIC-STUDIO/actions/runs?per_page=6', token);
  if (runs.workflow_runs) {
    runs.workflow_runs.forEach(r => {
      console.log(`- Run ID: ${r.id} | Name: "${r.name}" | Status: ${r.status} | Conclusion: ${r.conclusion} | Branch: ${r.head_branch} | SHA: ${r.head_sha} | Created: ${r.created_at}`);
    });
  }
}

main().catch(console.error);
