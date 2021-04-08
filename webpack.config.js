const path = require('path');

module.exports = {
    entry: './src/client/index.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js'
    },
    resolve: {
      extensions: ['.wasm', '.mjs', '.js', '.json', '.ts', '.tsx', '.jsx'],
    },
    module: {
        rules: [ {
            test: /\.ts$/,
            loader: 'babel-loader',
            options: {
                presets: [
                    ['@babel/preset-env']
                ]
            }
        } ]
    }
};
