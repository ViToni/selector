/* eslint-env node */
require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
    root: true,
    extends: [
        "eslint:recommended",
        // TypeScript version of eslint rules
        // also turns off some eslint rules which might interfere with their TypeScript counterparts
        "plugin:@typescript-eslint/recommended"
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest"
    },
    plugins: ["@typescript-eslint"],
    rules: {
        // custom rules
        indent: [
            "error", 4,
            {
                offsetTernaryExpressions: true,
                SwitchCase: 1
            }
        ],
        "max-len": ["error", { code: 120 }],
        semi: ["error", "always"],
        quotes: ["error", "double"],
        "comma-dangle": ["error", "never"],
        curly: ["error", "all"],
        "space-before-function-paren": [
            "error",
            {
                anonymous: "always",
                named: "never",
                asyncArrow: "always"
            }
        ],
        "no-trailing-spaces": "error",
        "no-mixed-spaces-and-tabs": "error",
        "block-spacing": "error",
        "comma-spacing": [
            "error",
            {
                "before": false,
                "after": true
            }
        ],
        "no-multi-spaces": [
            "error",
            {
                ignoreEOLComments: true
            }
        ],
        "key-spacing": [
            "error",
            {
                "afterColon": true,
                "mode": "minimum"
            }
        ],
        "semi-spacing": "error",
        "switch-colon-spacing": [
            "error",
            {
                "before": false,
                "after": true
            }
        ],
        "space-infix-ops": "error",
        "space-before-blocks": [
            "error",
            {
                functions: "always",
                keywords: "always",
                classes: "always"
            }
        ],

        // Note: you must disable the base rule as it can report incorrect errors
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                "argsIgnorePattern": "^_"
            }
        ]
    }
};
