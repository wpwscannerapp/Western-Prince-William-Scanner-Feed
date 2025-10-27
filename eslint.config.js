import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactRefresh from "eslint-plugin-react-refresh";

export default [
  {
    // Global ignores for files that should not be linted
    ignores: ["dist", "node_modules", ".netlify", "dev-dist"],
  },
  {
    // Apply this configuration to all JavaScript, JSX, TypeScript, and TSX files in the src directory
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest", // Use the latest ECMAScript version
        sourceType: "module", // Enable ES modules
        ecmaFeatures: {
          jsx: true, // Enable JSX support
        },
      },
      // Define global variables for browser and Node.js environments
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    // Register all necessary ESLint plugins
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "react-refresh": pluginReactRefresh,
      "@typescript-eslint": tseslint.plugin, // TypeScript ESLint plugin
    },
    // Configure settings for plugins, e.g., React version detection
    settings: {
      react: {
        version: "detect", // Automatically detect the React version
      },
    },
    // Define specific rules for linting
    rules: {
      // Spread recommended rules from various plugins
      ...pluginJs.configs.recommended.rules, // ESLint's built-in recommended rules
      ...pluginReact.configs.recommended.rules, // React plugin's recommended rules
      ...pluginReactHooks.configs.recommended.rules, // React Hooks plugin's recommended rules
      ...tseslint.configs.recommended.rules, // TypeScript ESLint plugin's recommended rules

      // Custom rules
      "react-refresh/only-export-components": "warn", // Warn about components that are not exported
      "react/prop-types": "off", // Disable prop-types check as TypeScript is used
      "@typescript-eslint/no-unused-vars": "error", // Enforce no unused variables for TypeScript
      "react/react-in-jsx-scope": "off", // Disable requirement for React to be in scope for JSX (for React 17+ JSX transform)
    },
  },
];