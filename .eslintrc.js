module.exports = {

    plugins: ['jsdoc', 'node'],

    extends: [
        'eslint:recommended',
        'plugin:node/recommended'
    ],

    env: {
        node: true,        
        es2021: true       
    },

    parserOptions: {
        ecmaVersion: 'latest',    
        sourceType: 'commonjs'      
    },

    rules: {

        'jsdoc/check-alignment': 'warn',              
        'jsdoc/check-indentation': 'warn',            
        'jsdoc/check-param-names': 'warn',            
        'jsdoc/require-jsdoc': [
            'warn',
            {
                require: {
                    FunctionDeclaration: true,          
                    MethodDefinition: true,            
                    ClassDeclaration: true             
                }
            }
        ],
        'jsdoc/require-param': 'warn',                 
        'jsdoc/require-returns': 'warn',               

        'node/no-missing-require': [ 'error',{ allowModules: ['@discordjs/rest', 'p-queue'] }],            
        'node/no-unpublished-require': 'error',        
        'node/no-deprecated-api': 'error',              
        'node/callback-return': 'error',                
        'node/exports-style': ['error', 'module.exports'], 
        'no-process-exit': 'off',

        indent: ['error', 4],                           
        quotes: ['error', 'single'],                     
        semi: ['error', 'always'],                       
        'max-len': ['warn', { code: 250 }],            
        'no-console': 'warn',                            
        'prefer-const': 'warn'                          
    },

    settings: {
        node: {
            version: '>=22.0.0',                  
            tryExtensions: ['.js', '.json']              
        }
    }
};
