import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";

const typescriptConfigs = tseslint.configs.recommended.map((config) => ({
  ...config,
  files: config.files ?? ["**/*.{ts,tsx,mts,cts}"],
}));

export default [
  { ignores: [".astro/**", "dist/**"] },
  ...eslintPluginAstro.configs.recommended,
  ...typescriptConfigs,
  {
    ...unicorn.configs["flat/recommended"],
    files: ["**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,astro}"],
  },
  {
    files: ["**/*.astro"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      ...tseslint.configs.recommended.at(-1).rules,
      "unicorn/filename-case": "off",
    },
  },
];
