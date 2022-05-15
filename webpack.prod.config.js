const path = require("path");

/** @type {import("webpack").Configuration} */
module.exports = {
  mode: "production",
  entry: ["./index.js"],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
  },
  devtool: "source-map",
  output: {
    filename: "aframe-gif-shader.min.js",
    path: path.resolve(__dirname, "dist"),
  },
};
