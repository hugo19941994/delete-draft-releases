import { defineConfig } from "eslint/config";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import vitest from "@vitest/eslint-plugin";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: compat.extends("prettier"),

    plugins: {
        prettier,
    },

    languageOptions: {
        globals: {
            ...globals.node,
        },
    },

    rules: {
        "prettier/prettier": ["error", {
            trailingComma: "none",
            singleQuote: true,
            printWidth: 120,
        }],
    },
},
{
    files: ["tests/**"], // or any other pattern
    plugins: {
      vitest
    },
    rules: {
      ...vitest.configs.recommended.rules, // you can also use vitest.configs.all.rules to enable all rules
      "vitest/max-nested-describe": ["error", { "max": 3 }] // you can also modify rules' behavior using option like this
    },
}]);
