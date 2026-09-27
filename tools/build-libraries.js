const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const librariesRoot = path.join(repositoryRoot, 'libs');
const tscPath = path.join(
    repositoryRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
);

const libraryConfigs = fs
    .readdirSync(librariesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(librariesRoot, entry.name, 'tsconfig.lib.json'))
    .filter((configPath) => fs.existsSync(configPath))
    .sort();

if (libraryConfigs.length === 0) {
    console.error('No library tsconfig files were found.');
    process.exit(1);
}

for (const configPath of libraryConfigs) {
    const libraryName = path.basename(path.dirname(configPath));
    console.log(`\nBuilding ${libraryName}`);

    const result = spawnSync(
        tscPath,
        [
            '--project',
            configPath,
        ],
        {
            cwd: repositoryRoot,
            stdio: 'inherit',
        },
    );

    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

console.log(`\nBuilt ${libraryConfigs.length} libraries.`);
