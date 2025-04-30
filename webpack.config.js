const path = require("path");

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    library: {
      type: "module",
    },
    clean: true,
  },
  experiments: {
    outputModule: true,
  },
  resolve: {
    extensions: [".js", ".jsx", ".ejs"],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
    ],
  },
  externals: {
    react: "react",
    "react-dom": "react-dom",
  },
  webpackFinal: async (config) => {
    config.module.rules.push({
      test: /\.ejs$/,
      use: "raw-loader",
    });
    return config;
  },
};
