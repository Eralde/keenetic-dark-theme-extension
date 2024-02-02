const webpack = require('webpack');
const path = require('path');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")

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
            test: /\.s[ac]ss$/i,
            use: [
                // Creates `style` nodes from JS strings
                "style-loader",
                // Translates CSS into CommonJS
                "css-loader",
                // Compiles Sass to CSS
                "sass-loader",
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

        config.optimization.minimizer = [
            new CssMinimizerPlugin(),
        ];

        return config;
    },
};
