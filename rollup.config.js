import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default {
    input: pkg.client_js_src,
    plugins: [
        babel({ extensions: ['.ts', '.tsx'], exclude: ['dist/**', 'node_modules/**'] }),
    ],
    output: [
        { file: pkg.client_js_bundle, format: 'iife'},
    ]
};