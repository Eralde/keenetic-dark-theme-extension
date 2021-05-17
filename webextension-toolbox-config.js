const webpack = require('webpack');
const path = require('path');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = {
    webpack: (config, {dev, vendor}) => {
        config.module.rules.push({
            test: /\.less$/,
            use: [
                {
                    loader: 'style-loader', // creates style nodes from JS strings
                },
                {
                    loader: 'css-loader', // translates CSS into CommonJS
                },
                {
                    loader: 'less-loader', // compiles Less to CSS
                },
            ],
        });

        config.module.rules.push({
            test: /\.html$/,
            include: [
                path.resolve(__dirname, 'app', 'pages', 'ui')
            ],
            exclude: /node_modules/,
            use: {
                loader: 'html-loader',
                options: {
                    minimize: false
                },
            },
        });

        config.module.rules.push({
            test: /\.css$/,
            use: [
                {
                    loader: 'style-loader', // creates style nodes from JS strings
                },
                {
                    loader: 'css-loader', // translates CSS into CommonJS
                },
            ],
        });

        config.plugins.push(
            new OptimizeCssAssetsPlugin({
                cssProcessor: require('cssnano'),
                cssProcessorPluginOptions: {
                    preset: ['default', {discardComments: {removeAll: true}}],
                },
                canPrint: true
            })
        );

        return config
    },
};
