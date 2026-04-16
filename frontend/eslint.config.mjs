import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import tailwindcss from "eslint-plugin-tailwindcss";

export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  ...tailwindcss.configs["flat/recommended"],
  {
    rules: {
      "tailwindcss/no-custom-classname": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
    settings: {
      tailwindcss: {
        callees: ["cn", "clsx"],
      },
    },
  },
];
