const { Octokit } = require("@octokit/rest");

exports.handler = async (event) => {
    const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
    try {
        const { token, ngrok } = JSON.parse(event.body);
        const octokit = new Octokit({ auth: token });
        const repo = "RDP-RUN-" + Math.floor(Math.random() * 999);
        const { data: user } = await octokit.users.getAuthenticated();

        // ১. রিপোজিটরি তৈরি
        await octokit.repos.createForAuthenticatedUser({ name: repo, private: false });

        // ২. Workflow ফাইল
        const code = Buffer.from(`
name: RDP
on: [workflow_dispatch, push]
jobs:
  build:
    runs-on: windows-latest
    steps:
      - name: Start
        run: |
          net user runneradmin FreeRDP@2026
          Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server' -Name "fDenyTSConnections" -Value 0
          Invoke-WebRequest https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-windows-amd64.zip -OutFile ng.zip
          Expand-Archive ng.zip
          ./ngrok/ngrok.exe authtoken ${ngrok}
          Start-Process ./ngrok/ngrok.exe -ArgumentList "tcp 3389"
          sleep 21600
        `).toString('base64');

        // ৩. ফাইল পুশ (এটি পুশ হওয়া মাত্রই অ্যাকশন রান হবে)
        await octokit.repos.createOrUpdateFileContents({
            owner: user.login, repo: repo, path: '.github/workflows/main.yml',
            message: 'start', content: code
        });

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) };
    }
};
