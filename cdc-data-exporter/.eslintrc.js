require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  env: {
    es2021: true,
    node: true
  },
  rules: {
    "max-classes-per-file": "off",
    "no-console": "off"
  },
  parser: "@typescript-eslint/parser",
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      extends: [
        "@pagopa/eslint-config/recommended"
      ],
      parserOptions: {
        project: ["./tsconfig.json"]
      }
    }
  ]
};