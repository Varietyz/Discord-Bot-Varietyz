module.exports = {
    // Specify the plugins used by ESLint
    plugins: ['jsdoc', 'node'],

    // Extend recommended ESLint and Node.js configurations
    extends: [
        'eslint:recommended',
        'plugin:node/recommended'
    ],

    // Define the environments your script is designed to run in
    env: {
        node: true,        // Node.js global variables and Node.js scoping
        es2021: true       // Enable all ECMAScript 2021 globals and syntax
    },

    // Parser options to specify ECMAScript features
    parserOptions: {
        ecmaVersion: 'latest',    // Allows for the parsing of modern ECMAScript features
        sourceType: 'module'      // Allows for the use of imports
    },

    // Define custom rules and override default settings
    rules: {
        // JSDoc Rules
        'jsdoc/check-alignment': 'error',              // Ensure JSDoc comments are properly aligned
        'jsdoc/check-indentation': 'error',            // Check that JSDoc blocks are correctly indented
        'jsdoc/check-param-names': 'error',            // Verify that parameter names in JSDoc match those in the function
        'jsdoc/require-jsdoc': [
            'error',
            {
                require: {
                    FunctionDeclaration: true,          // Require JSDoc for function declarations
                    MethodDefinition: true,            // Require JSDoc for class methods
                    ClassDeclaration: true             // Require JSDoc for class declarations
                }
            }
        ],
        'jsdoc/require-param': 'error',                 // Ensure that @param tags are present in JSDoc
        'jsdoc/require-returns': 'error',               // Ensure that @returns tags are present in JSDoc

        // Node.js Rules
        'node/no-missing-require': 'error',            // Disallow require() expressions with missing modules
        'node/no-unpublished-require': 'error',        // Disallow require() expressions referencing modules that are not listed in package.json
        'node/no-deprecated-api': 'error',              // Disallow deprecated Node.js APIs
        'node/callback-return': 'error',                // Enforce return after a callback
        'node/exports-style': ['error', 'module.exports'], // Enforce the consistent use of module.exports

        // General Coding Style Rules
        indent: ['error', 4],                           // Enforce consistent indentation (4 spaces)
        quotes: ['error', 'single'],                     // Enforce the consistent use of single quotes
        semi: ['error', 'always'],                       // Require or disallow semicolons instead of ASI
        'max-len': ['error', { code: 250 }],            // Enforce a maximum line length of 250 characters
        'no-console': 'warn',                            // Warn about the use of console (can be set to 'off' if desired)
        'prefer-const': 'error'                          // Suggest using const over let when variables are not reassigned
    },

    // Settings for plugins
    settings: {
        node: {
            tryExtensions: ['.js', '.json']              // File extensions to try for imports
        }
    }
};
