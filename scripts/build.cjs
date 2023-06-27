const { readdirSync, readFileSync, statSync, writeFileSync } = require("fs");
const { extname, join } = require("path");
const { outDir } = require("../tsconfig.json").compilerOptions;

const changeImportStatements = (dir) => {
	const files = readdirSync(dir);
	files.forEach((file) => {
		const filePath = join(dir, file);
		const fileExtension = ".js";
		if (statSync(filePath).isDirectory()) {
			changeImportStatements(filePath);
		} else if (extname(filePath) === fileExtension) {
			const fileContent = readFileSync(filePath, "utf8");
			const modifiedContent = fileContent.replace(/(from\s+['"])(\.{1,2}\/.*)(['"])/g, `$1$2${fileExtension}$3`);
			writeFileSync(filePath, modifiedContent, "utf8");
		}
	});
};

changeImportStatements(outDir);
