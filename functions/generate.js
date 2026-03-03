const { Octokit } = require("@octokit/rest");

exports.handler = async (event) => {
    const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

    try {
        const { token, ngrok } = JSON.parse(event.body);
        const octokit = new Octokit({ auth: token });
        const repo = "Session-" + Math.floor(Math.random() * 9999);
        const { data: user } = await octokit.users.getAuthenticated();

        // ১. রিপোজিটরি তৈরি
        await octokit.repos.createForAuthenticatedUser({ name: repo, private: false });

        // ২. ফিক্সড Workflow কোড (Path এরর সমাধান)
        const code = Buffer.from(`
name: RDP_GEN
on: [push, workflow_dispatch]
jobs:
  build:
    runs-on: windows-latest
    steps:
      - name: Start
        run: |
          net user runneradmin FreeRDP@2026
          Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server' -Name "fDenyTSConnections" -Value 0
          Invoke-WebRequest https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-windows-amd64.zip -OutFile ngrok.zip
          Expand-Archive ngrok.zip -DestinationPath .
          ./ngrok.exe authtoken ${ngrok}
          Start-Process ./ngrok.exe -ArgumentList "tcp 3389"
          Write-Host "RDP Active for 6 Hours!"
          sleep 21600
        `).toString('base64');

        // ৩. ফাইল পুশ
        await octokit.repos.createOrUpdateFileContents({
            owner: user.login, repo: repo, path: '.github/workflows/main.yml',
            message: '🚀 Fixed Path Error', content: code
        });

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) };
    }
};
