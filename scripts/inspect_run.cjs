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
  const url = `https://api.github.com/repos/Sohag446/CINEMATIC-STUDIO/actions/runs/${runId}/jobs`;
  
  https.get(url, { headers: { 'User-Agent': 'Node.js', 'Authorization': `token ${token}` } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const data = JSON.parse(d);
      if (data.jobs && data.jobs[0]) {
        const job = data.jobs[0];
        console.log(`Job: ${job.name} | Status: ${job.status} | Conclusion: ${job.conclusion}`);
        job.steps.forEach(s => {
          console.log(`  Step ${String(s.number).padStart(2, '0')}: ${s.name} [${s.status}${s.conclusion ? ' / ' + s.conclusion : ''}]`);
        });
      }
    });
  });
}

main().catch(console.error);
