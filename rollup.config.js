const fs = require('fs');
const path = require('path');

const commonjs = require('@rollup/plugin-commonjs');
const nodeResolve = require('@rollup/plugin-node-resolve');
const jsonPlugin = require('@rollup/plugin-json');
const { minify } = require('rollup-plugin-esbuild-minify');

const copy = (src, dest) => {
    const srcPath = path.resolve(...src);
    const destPath = path.resolve(...dest);
    fs.copyFileSync(path.resolve(srcPath), path.resolve(destPath));
    console.log(`Copied ${srcPath} -> ${destPath}`);
};

module.exports = {
    input: './dist/src/index.js',
    output: {
        file: 'build/index.js',
        format: 'esm',
        minifyInternalExports: true,
    },
    external: (id) =>
        ['config.json', 'express', '@popstarfreas/dimensions'].some((name) =>
            id.endsWith(name),
        ),
    plugins: [
        nodeResolve(),
        commonjs(),
        jsonPlugin(),
        {
            name: 'copy-files',
            writeBundle() {
                copy(['src/config.json'], ['build', 'config.json']);
                copy(['README.md'], ['build', 'README.md']);
                copy(['LICENSE'], ['build', 'LICENSE']);
            },
        },
        minify(),
    ],
};
