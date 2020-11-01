module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        "@typescript-eslint/no-unused-vars": ["error", { "args": "none" }],
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/ban-types": ["error", { "extendDefaults": true, "types": { "object": false } }],
        "@typescript-eslint/no-non-null-assertion": "off",
    },
};
