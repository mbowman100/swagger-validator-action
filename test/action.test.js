const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const { gzipSync } = require('node:zlib');
const { mkdtempSync, writeFileSync, readFileSync, rmSync, cpSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const valid = {
    openapi: '3.0.0', info: { title: 'Test', version: '1.0' },
    paths: { '/test': { post: { responses: { 200: { description: 'OK' } } } } },
};

for (const entry of ['index.js', 'dist/index.js']) {
    test(entry, async t => {
        const dir = mkdtempSync(path.join(tmpdir(), 'swagger-validator-test-'));
        t.after(() => rmSync(dir, { recursive: true, force: true }));
        const entryPath = entry === 'dist/index.js' ? path.join(dir, 'bundle', 'index.js') : path.join(root, entry);
        if (entry === 'dist/index.js') {
            cpSync(path.join(root, 'dist'), path.join(dir, 'bundle'), { recursive: true });
        }
        const good = path.join(dir, 'valid.json');
        const spaced = path.join(dir, 'valid with spaces.json');
        const bad = path.join(dir, 'invalid.json');
        const invalid = structuredClone(valid);
        invalid.paths['/test'].post.requestBody = {
            content: { 'application/json': { schema: { type: 'object' } }, required: true },
        };
        writeFileSync(good, JSON.stringify(valid));
        writeFileSync(spaced, JSON.stringify(valid));
        writeFileSync(bad, JSON.stringify(invalid));

        async function run(files, separator = '', preload) {
            const output = path.join(dir, 'outputs');
            writeFileSync(output, '');
            const child = spawn(process.execPath, [...(preload ? ['--require', preload] : []), entryPath], {
                cwd: dir,
                env: { ...process.env, INPUT_FILES: files, INPUT_SPACE_SEPARATED: separator, GITHUB_OUTPUT: output },
                timeout: 15000,
            });
            let stdout = '', stderr = '';
            child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
            child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
            const status = await new Promise((resolve, reject) => {
                child.once('error', reject);
                child.once('close', (code, signal) => signal ? reject(new Error(`Action terminated: ${signal}`)) : resolve(code));
            });
            const result = { status, stdout, stderr };
            const outputs = {};
            const lines = readFileSync(output, 'utf8').split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                const match = /^(validFiles|invalidFiles)<<(.+)$/.exec(lines[i]);
                if (match) {
                    const end = lines.indexOf(match[2], i + 1);
                    assert.ok(end > i);
                    outputs[match[1]] = JSON.parse(lines.slice(i + 1, end).join('\n'));
                    i = end;
                }
            }
            assert.doesNotMatch(result.stdout, /::set-output/);
            return { ...result, outputs };
        }

        await t.test('valid JSON and YAML produce validFiles using environment-file outputs', async () => {
            const yaml = path.join(root, 'example.openapi.yaml');
            const result = await run(`${good} ${yaml}`);
            assert.equal(result.status, 0, result.stdout + result.stderr);
            assert.deepEqual(result.outputs, { validFiles: [good, yaml], invalidFiles: [] });
        });
        await t.test('rejects misplaced content.required and continues with remaining files', async () => {
            const result = await run(`${bad}\n${good}\n\n`);
            assert.equal(result.status, 1);
            assert.deepEqual(result.outputs, { validFiles: [good], invalidFiles: [bad] });
            assert.match(result.stdout, /required/);
        });
        for (const separator of ['false', '0']) {
            await t.test(`newline lists preserve spaces with space_separated=${separator}`, async () => {
                const result = await run(`${spaced}\r\n${good}\r\n`, separator);
                assert.equal(result.status, 0, result.stdout + result.stderr);
                assert.deepEqual(result.outputs.validFiles, [spaced, good]);
            });
        }
        for (const separator of ['true', '1']) {
            await t.test(`space_separated=${separator} supports JSON lists`, async () => {
                const result = await run(`${good} ${good}`, separator);
                assert.equal(result.status, 0, result.stdout + result.stderr);
                assert.deepEqual(result.outputs.validFiles, [good, good]);
            });
        }
        await t.test('missing files fail and appear in invalidFiles', async () => {
            const missing = path.join(dir, 'missing.json');
            const result = await run(missing);
            assert.equal(result.status, 1);
            assert.deepEqual(result.outputs.invalidFiles, [missing]);
        });
        await t.test('unresolvable references fail validation', async () => {
            const broken = structuredClone(valid);
            broken.paths['/test'].post.requestBody = { $ref: '#/components/requestBodies/missing' };
            const refFile = path.join(dir, 'broken-ref.json');
            writeFileSync(refFile, JSON.stringify(broken));
            const result = await run(refFile);
            assert.equal(result.status, 1);
            assert.deepEqual(result.outputs.invalidFiles, [refFile]);
        });
        for (const protocol of ['http', 'https']) {
            await t.test(`resolves compressed ${protocol} references without external services`, async t => {
                const requests = [];
                const server = http.createServer((req, res) => {
                    requests.push(req.url);
                    const schema = { type: req.url === '/invalid.json' ? 'invalid-type' : 'object' };
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' });
                    res.end(gzipSync(JSON.stringify(schema)));
                });
                await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
                t.after(() => new Promise(resolve => server.close(resolve)));
                // Exercise public-host safety checks and native dynamic imports, while
                // redirecting all transport to our isolated local fixture server.
                const preload = path.join(dir, 'remote-preload.cjs');
                writeFileSync(preload, `
                    const assert = require('node:assert/strict');
                    const dns = require('node:dns/promises');
                    dns.lookup = async hostname => {
                        assert.equal(hostname, 'schemas.example.test');
                        return [{ address: '93.184.216.34', family: 4 }];
                    };
                    const http = require('node:http');
                    const request = http.request;
                    const redirect = (url, options, callback) => {
                        assert.equal(url.hostname, 'schemas.example.test');
                        return request(new URL('http://127.0.0.1:${server.address().port}' + url.pathname), options, callback);
                    };
                    http.request = redirect;
                    require('node:https').request = redirect;
                    require('node:module').syncBuiltinESMExports();
                `);
                for (const name of ['valid', 'invalid']) {
                    const document = structuredClone(valid);
                    document.paths['/test'].post.responses[200].content = {
                        'application/json': { schema: { $ref: `${protocol}://schemas.example.test/${name}.json` } },
                    };
                    const file = path.join(dir, `remote-${name}.json`);
                    writeFileSync(file, JSON.stringify(document));
                    const result = await run(file, '', preload);
                    assert.equal(result.status, name === 'valid' ? 0 : 1, result.stdout + result.stderr);
                    assert.deepEqual(result.outputs, {
                        validFiles: name === 'valid' ? [file] : [],
                        invalidFiles: name === 'invalid' ? [file] : [],
                    });
                    assert.doesNotMatch(result.stdout + result.stderr, /Cannot find module/);
                }
                assert.deepEqual(requests, ['/valid.json', '/invalid.json']);
            });
        }
        await t.test('empty required input fails', async () => {
            assert.equal((await run('')).status, 1);
        });
        await t.test('invalid separator fails', async () => {
            assert.equal((await run(good, 'invalid')).status, 1);
        });
    });
}
