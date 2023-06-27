const { readdirSync } = require("fs");
const { baseUrl } = require("./tsconfig.json").compilerOptions;

/**
 * @template {import('prettier').Config} T
 * @param {T} config - A generic parameter that flows through to the return type
 * @constraint {{import('prettier').Config}}
 */
function definePrettierConfig(config) {
	return config;
}

module.exports = definePrettierConfig({
	plugins: [require("@trivago/prettier-plugin-sort-imports")],
	importOrder: ["<THIRD_PARTY_MODULES>", "^.?[./]"],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
	overrides: [
		{
			files: "*.css",
			options: {
				singleQuote: false,
			},
		},
	],
	jsxSingleQuote: false,
	bracketSpacing: true,
	bracketSameLine: true,
	useTabs: true,
	semi: true,
	tabWidth: 4,
	printWidth: 120,
	endOfLine: "lf",
});
