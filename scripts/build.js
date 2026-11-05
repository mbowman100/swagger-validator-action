const { rmSync, readFileSync, readdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');

// Preserve variable-based imports of Node built-ins in the reference resolver.
// ncc turns these into empty webpack contexts that throw at runtime.
rmSync('dist', { recursive: true, force: true });
const result = buildSync({
    entryPoints: ['index.js'],
    outfile: 'dist/index.js',
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    minify: true,
    legalComments: 'linked',
    metafile: true,
});

// Keep full third-party license notices alongside esbuild's inline notices.
const packages = new Set(Object.keys(result.metafile.inputs)
    .filter(input => input.startsWith('node_modules/'))
    .map(input => input.split('/').slice(0, input.startsWith('node_modules/@') ? 3 : 2).join('/')));
const notices = [...packages].sort().flatMap(directory =>
    readdirSync(directory).sort().filter(file => /^licen[sc]e(?:\.|$)/i.test(file))
        .map(file => `${directory}\n${readFileSync(path.join(directory, file), 'utf8').trim()}\n`));
writeFileSync('dist/licenses.txt', notices.join('\n'));
