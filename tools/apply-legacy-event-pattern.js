const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const scanDirectories = ['libs', 'apps'];
const skipDirectoryNames = new Set(['node_modules', 'dist']);

function collectTypeScriptFiles(directory, files) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!skipDirectoryNames.has(entry.name)) {
                collectTypeScriptFiles(path.join(directory, entry.name), files);
            }
            continue;
        }
        if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
            files.push(path.join(directory, entry.name));
        }
    }
    return files;
}

function parseSpecifiers(specifiersRaw) {
    return specifiersRaw
        .split(',')
        .map((specifier) => specifier.trim())
        .filter(Boolean);
}

const nestMicroservicesImportPattern = /import\s*\{([^}]*)\}\s*from\s*(['"])@nestjs\/microservices\2;?/;
const legacyHelperImportPattern = /import\s*\{([^}]*)\}\s*from\s*(['"])@ubs-platform\/microservice-setup-util\2;?/;

function applyLegacyEventPattern(content) {
    if (!content.includes('@EventPattern(')) {
        return null;
    }

    let updated = content.replace(/@EventPattern\(/g, '@LegacyEventPattern(');
    let legacyImportHandled = false;

    if (legacyHelperImportPattern.test(updated)) {
        updated = updated.replace(legacyHelperImportPattern, (whole, specifiersRaw, quote) => {
            const specifiers = parseSpecifiers(specifiersRaw);
            if (!specifiers.includes('LegacyEventPattern')) {
                specifiers.push('LegacyEventPattern');
            }
            legacyImportHandled = true;
            return `import { ${specifiers.join(', ')} } from ${quote}@ubs-platform/microservice-setup-util${quote};`;
        });
    }

    updated = updated.replace(nestMicroservicesImportPattern, (whole, specifiersRaw, quote) => {
        const remainingSpecifiers = parseSpecifiers(specifiersRaw).filter(
            (specifier) => specifier !== 'EventPattern',
        );

        const statements = [];
        if (remainingSpecifiers.length > 0) {
            statements.push(
                `import { ${remainingSpecifiers.join(', ')} } from ${quote}@nestjs/microservices${quote};`,
            );
        }
        if (!legacyImportHandled) {
            statements.push(
                `import { LegacyEventPattern } from '@ubs-platform/microservice-setup-util';`,
            );
            legacyImportHandled = true;
        }
        return statements.join('\n');
    });

    if (!legacyImportHandled) {
        throw new Error('Could not locate an import to attach LegacyEventPattern next to.');
    }

    return updated;
}

const targetFiles = scanDirectories.flatMap((directory) =>
    collectTypeScriptFiles(path.join(repositoryRoot, directory), []),
);

let changedCount = 0;
for (const filePath of targetFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const updated = applyLegacyEventPattern(content);
    if (updated === null || updated === content) {
        continue;
    }
    fs.writeFileSync(filePath, updated);
    changedCount += 1;
    console.log(`Updated ${path.relative(repositoryRoot, filePath)}`);
}

console.log(`\n${changedCount} file(s) migrated to LegacyEventPattern.`);
