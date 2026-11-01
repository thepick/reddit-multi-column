const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

exports.startFixtureServer = async function () {
    const files = new Map([
        ['/tests/browser.html', ['browser.html', 'text/html']],
        ['/src/settings.js', ['../src/settings.js', 'text/javascript']],
        ['/src/content.js', ['../src/content.js', 'text/javascript']],
        ['/src/content.css', ['../src/content.css', 'text/css']]
    ]);
    const server = http.createServer(async function (request, response) {
        const file = files.get(new URL(request.url, 'http://127.0.0.1').pathname);
        if (!file) { response.writeHead(404); response.end(); return; }
        try {
            const content = await fs.readFile(path.join(__dirname, file[0]));
            response.writeHead(200, { 'Content-Type': file[1] }); response.end(content);
        } catch { response.writeHead(500); response.end(); }
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    return { url: `http://127.0.0.1:${server.address().port}/tests/browser.html`, close() { server.closeAllConnections(); server.close(); } };
};
