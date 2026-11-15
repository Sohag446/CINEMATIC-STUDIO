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
    return null;
  }
}

async function main() {
  const token = getGitHubToken();
  const runId = '43695910783';
  
  // First get jobs
  const jobsData = await new Promise((resolve) => {
    https.get(`https://api.github.com/repos/Sohag446/CINEMATIC-STUDIO/actions/runs/${runId}/jobs`, {
      headers: { 'User-Agent': 'Node.js', 'Authorization': `token ${token}` }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });

  const jobId = jobsData.jobs[0].id;
  console.log('Job ID:', jobId);

  // Get job logs
  https.get(`https://api.github.com/repos/Sohag446/CINEMATIC-STUDIO/actions/jobs/${jobId}/logs`, {
    headers: { 'User-Agent': 'Node.js', 'Authorization': `token ${token}` }
  }, res => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      https.get(res.headers.location, res2 => {
        let d = ''; res2.on('data', c => d += c);
        res2.on('end', () => {
          const lines = d.split('\n');
          const errLines = lines.filter(l => l.includes('FAIL') || l.includes('Error') || l.includes('error') || l.includes('assert'));
          console.log('Error lines:');
          errLines.slice(0, 30).forEach(l => console.log(l));

          // Also find where "Execute Automated Test Suites" begins
          const idx = lines.findIndex(l => l.includes('Execute Automated Test Suites'));
          if (idx !== -1) {
            console.log('\n--- Step Output ---');
            lines.slice(idx, idx + 60).forEach(l => console.log(l));
          }
        });
      });
    }
  });
}

main().catch(console.error);
