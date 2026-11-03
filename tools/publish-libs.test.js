const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const path = require('node:path');
const { IksirPackage } = require('./data/iksir-package');
const { PackageBuilder } = require('./data/package-build');
const { AllLibrariesBuilder } = require('./operation/all-libraries-builder');
const { ExecUtil } = require('./util/exec-util');

function setup(t, provenance = false) {
    const argv = process.argv;
    const exitCode = process.exitCode;
    const previousProvenance = process.env.XR_NPM_PROVENANCE;
    process.env.XR_NPM_PROVENANCE = String(provenance);
    t.after(() => {
        process.argv = argv;
        process.exitCode = exitCode;
        if (previousProvenance === undefined) {
            delete process.env.XR_NPM_PROVENANCE;
        } else {
            process.env.XR_NPM_PROVENANCE = previousProvenance;
        }
        delete require.cache[require.resolve('./xr')];
    });
    const root = {
        projectMode: 'ROOT',
        directory: '/fixture',
        version: '1.2.3',
        childrenVersionTag: 'beta',
        childrenAccess: 'restricted',
        children: ['first', 'second', 'embedded'].map((name) => ({
            packageName: `@fixture/${name}`,
            packageObject: { name: `@fixture/${name}` },
            buildDirectory: `/fixture/build output/${name}`,
            libraryMode: name === 'embedded' ? 'EMBEDDED' : 'PEER',
        })),
    };
    t.mock.method(IksirPackage, 'scanRoot', async () => root);
    t.mock.method(PackageBuilder.prototype, 'prebuild', async () => {});
    t.mock.method(PackageBuilder.prototype, 'writePackage', async () => {});
    const info = t.mock.method(console, 'info', () => {});
    const errors = t.mock.method(console, 'error', () => {});
    const exec = t.mock.method(ExecUtil, 'exec', async () => 'stage-id: fixture-stage');
    const copy = t.mock.method(fs, 'cp', async () => {});
    return { root, info, errors, exec, copy };
}

async function runCli(...args) {
    process.argv = ['node', 'xr', ...args];
    delete require.cache[require.resolve('./xr')];
    require('./xr');
    await new Promise((resolve) => setImmediate(resolve));
}

for (const direct of [false, true]) {
    for (const provenance of [false, true]) {
        test(`publish-libs direct=${direct} provenance=${provenance}`, async (t) => {
            const { exec, info, copy } = setup(t, provenance);
            await runCli('publish-libs', ...(direct ? ['--direct'] : []));
            const command = direct ? 'npm publish' : 'npm stage publish';
            const options = provenance
                ? '--tag beta --provenance --access public'
                : '--tag beta --access restricted';
            assert.deepEqual(
                exec.mock.calls.map((call) => call.arguments[0]),
                ['first', 'second'].map(
                    (name) => `cd "/fixture/build output/${name}" && ${command} ${options}`,
                ),
            );
            assert.equal(copy.mock.callCount(), 0);
            assert.equal(
                info.mock.calls.filter((call) => call.arguments[0] === 'stage-id: fixture-stage').length,
                2,
            );
        });
    }
}

test('builder defaults to staged publishing without directPublish', async (t) => {
    const { root, exec } = setup(t);
    await new AllLibrariesBuilder(root).initiateBuildPublish({ publishNpm: true });
    assert.equal(exec.mock.callCount(), 2);
    assert.ok(exec.mock.calls.every((call) => call.arguments[0].includes('npm stage publish')));
});

test('patch-libs awaits copies and never publishes', async (t) => {
    const { root, exec, copy, info } = setup(t);
    const completedCopies = [];
    copy.mock.mockImplementation(async (source, target) => {
        await new Promise((resolve) => setImmediate(resolve));
        completedCopies.push(target);
    });
    info.mock.mockImplementation((message) => {
        if (typeof message === 'string' && message.includes('Patched @fixture/')) {
            assert.equal(completedCopies.length, copy.mock.callCount());
        }
    });
    await new AllLibrariesBuilder(root).initiateBuildPublish({
        patchAnotherDirectory: true,
        patchTarget: 'consumer/node_modules',
    });
    assert.equal(exec.mock.callCount(), 0);
    assert.deepEqual(
        copy.mock.calls.map((call) => call.arguments),
        ['first', 'second'].map((name) => [
            `/fixture/build output/${name}`,
            path.join('consumer/node_modules', `@fixture/${name}`),
            { recursive: true },
        ]),
    );
    assert.equal(completedCopies.length, 2);
});

for (const direct of [false, true]) {
    test(`publish failure exits nonzero without fallback, direct=${direct}`, async (t) => {
        const { exec, errors, info } = setup(t);
        const failure = new Error('npm publish failed');
        exec.mock.mockImplementation(async () => { throw failure; });
        await runCli('publish-libs', ...(direct ? ['--direct'] : []));
        assert.equal(exec.mock.callCount(), 1);
        assert.equal(process.exitCode, 1);
        assert.equal(errors.mock.calls[0].arguments[0], failure);
        assert.ok(info.mock.calls.every(
            (call) => !String(call.arguments[0]).includes('It seems there is no problem'),
        ));
    });
}
