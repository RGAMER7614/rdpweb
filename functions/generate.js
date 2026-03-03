const { Octokit } = require("@octokit/rest");

exports.handler = async (event) => {
    const headers = { 
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json" 
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

    try {
        const { token } = JSON.parse(event.body);
        const octokit = new Octokit({ auth: token });
        
        // Ngrok Authtoken (আপনার পার্সোনাল টোকেন এখানে দিয়ে দিন যাতে ইউজারকে দিতে না হয়)
        const NGROK_AUTH = "আপনার_এনগ্রোক_অথ_টোকেন_এখানে_দিন"; 
        
        const repoName = "Cloud-Server-" + Math.floor(Math.random() * 9999);
        const { data: user } = await octokit.users.getAuthenticated();

        // ১. অটোমেটিক রিপোজিটরি তৈরি
        await octokit.repos.createForAuthenticatedUser({ 
            name: repoName, 
            private: false,
            description: "Automated RDP Session"
        });

        // ২. ফিক্সড পাথ এবং অটো-রান কোড
        const workflowContent = Buffer.from(`
name: RDP_GEN
on: [push, workflow_dispatch]
jobs:
  build:
    runs-on: windows-latest
    steps:
      - name: Setup and Run
        run: |
          net user runneradmin FreeRDP@2026
          Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server' -Name "fDenyTSConnections" -Value 0
          Invoke-WebRequest https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-windows-amd64.zip -OutFile ngrok.zip
          Expand-Archive ngrok.zip -DestinationPath .
          ./ngrok.exe authtoken ${NGROK_AUTH}
          Start-Process ./ngrok.exe -ArgumentList "tcp 3389"
          Write-Host "RDP Active for 6 Hours!"
          sleep 21600
        `).toString('base64');

        // ৩. ফাইল পুশ করা (যা অ্যাকশন ট্রিগার করবে)
        await octokit.repos.createOrUpdateFileContents({
            owner: user.login,
            repo: repoName,
            path: '.github/workflows/main.yml',
            message: '🚀 System Boot',
            content: workflowContent
        });

        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ success: true, repo: repoName, user: user.login }) 
        };
    } catch (err) {
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ success: false, error: err.message }) 
        };
    }
};
