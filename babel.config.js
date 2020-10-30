module.exports = (api) => ({
  "presets": [
    api.env("test") ? [
      "@babel/env",
      {
        targets: {
          node: 'current',
        },
      }
    ] : "@babel/env",
    "@babel/typescript"
  ],
  "plugins": [
    "@babel/proposal-class-properties",
    "@babel/proposal-object-rest-spread",
    ["module-resolver", {
      "root": ["./"],
      "alias": {
        "src": "./src",
        "client": "./src/client",
        "common": "./src/common",
        "server": "./src/server",
        "package.json": "./package.json"
      }
    }]
  ]
});
