// Uses the already-installed Edge browser and Node built-ins. No packages to install.
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { startFixtureServer } = require('./browser-server.cjs');
const assert = require('node:assert/strict');

(async () => {
    const executable = process.env.RMC_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    await fs.access(executable);
    const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'rmc-browser-check-'));
    const browser = spawn(executable, ['--headless', '--disable-background-networking', '--no-first-run',
        '--no-default-browser-check', '--window-size=1600,1000', '--remote-debugging-port=0',
        '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`], { windowsHide: true, stdio: 'ignore' });
    let socket;
    let send;
    let fixtureServer;
    try {
        let port;
        for (let i = 0; i < 100; i++) {
            try { port = Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
            catch { await new Promise(resolve => setTimeout(resolve, 100)); }
        }
        assert.ok(port, 'browser debugging endpoint must start');
        const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
        const pending = new Map(); let id = 0;
        socket.onmessage = ({ data }) => {
            const response = JSON.parse(data); const callback = pending.get(response.id);
            if (callback) { pending.delete(response.id); callback(response); }
        };
        send = (method, params = {}) => new Promise((resolve, reject) => {
            const requestId = ++id;
            const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`Timed out: ${method}`)); }, 10000);
            pending.set(requestId, response => { clearTimeout(timer); response.error ? reject(new Error(JSON.stringify(response.error))) : resolve(response.result); });
            socket.send(JSON.stringify({ id: requestId, method, params }));
        });
        fixtureServer = await startFixtureServer();
        await send('Page.navigate', { url: fixtureServer.url });
        let status;
        for (let i = 0; i < 100; i++) {
            const result = await send('Runtime.evaluate', { expression: 'document.documentElement.dataset.testResult' });
            status = result.result.value;
            if (status) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        const result = await send('Runtime.evaluate', { expression: 'document.getElementById("results")?.textContent' });
        console.log(result.result.value);
        assert.equal(status, 'PASS', 'real-browser fixture must pass');
    } finally {
        fixtureServer?.close();
        if (send && socket?.readyState === WebSocket.OPEN) {
            try { await send('Browser.close'); } catch { /* Browser may close before replying. */ }
        }
        socket?.close();
        // Terminate only the process this check launched; never touch personal browser sessions.
        if (browser.exitCode === null) browser.kill();
        // Keep the temporary profile if Windows still holds a lock; it has no personal session data.
        await fs.rm(profile, { recursive: true, force: true, maxRetries: 2 }).catch(() => {});
    }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
