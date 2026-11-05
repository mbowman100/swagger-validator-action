const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
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

        function run(files, separator = '') {
            const output = path.join(dir, 'outputs');
            writeFileSync(output, '');
            const result = spawnSync(process.execPath, [entryPath], {
                cwd: dir,
                env: { ...process.env, INPUT_FILES: files, INPUT_SPACE_SEPARATED: separator, GITHUB_OUTPUT: output },
                encoding: 'utf8', timeout: 15000,
            });
            assert.ifError(result.error);
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

        await t.test('valid JSON and YAML produce validFiles using environment-file outputs', () => {
            const yaml = path.join(root, 'example.openapi.yaml');
            const result = run(`${good} ${yaml}`);
            assert.equal(result.status, 0, result.stdout + result.stderr);
            assert.deepEqual(result.outputs, { validFiles: [good, yaml], invalidFiles: [] });
        });
        await t.test('rejects misplaced content.required and continues with remaining files', () => {
            const result = run(`${bad}\n${good}\n\n`);
            assert.equal(result.status, 1);
            assert.deepEqual(result.outputs, { validFiles: [good], invalidFiles: [bad] });
            assert.match(result.stdout, /required/);
        });
        for (const separator of ['false', '0']) {
            await t.test(`newline lists preserve spaces with space_separated=${separator}`, () => {
                const result = run(`${spaced}\r\n${good}\r\n`, separator);
                assert.equal(result.status, 0, result.stdout + result.stderr);
                assert.deepEqual(result.outputs.validFiles, [spaced, good]);
            });
        }
        for (const separator of ['true', '1']) {
            await t.test(`space_separated=${separator} supports JSON lists`, () => {
                const result = run(`${good} ${good}`, separator);
                assert.equal(result.status, 0, result.stdout + result.stderr);
                assert.deepEqual(result.outputs.validFiles, [good, good]);
            });
        }
        await t.test('missing files fail and appear in invalidFiles', () => {
            const missing = path.join(dir, 'missing.json');
            const result = run(missing);
            assert.equal(result.status, 1);
            assert.deepEqual(result.outputs.invalidFiles, [missing]);
        });
        await t.test('unresolvable references fail validation', () => {
            const broken = structuredClone(valid);
            broken.paths['/test'].post.requestBody = { $ref: '#/components/requestBodies/missing' };
            const refFile = path.join(dir, 'broken-ref.json');
            writeFileSync(refFile, JSON.stringify(broken));
            const result = run(refFile);
            assert.equal(result.status, 1);
            assert.deepEqual(result.outputs.invalidFiles, [refFile]);
        });
        await t.test('empty required input fails', () => {
            assert.equal(run('').status, 1);
        });
        await t.test('invalid separator fails', () => {
            assert.equal(run(good, 'invalid').status, 1);
        });
    });
}
