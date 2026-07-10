import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "index.html", "_headers", "manifest.webmanifest", "sw.js", "README.md",
  "assets/app.js", "assets/styles.css", "assets/seed.js", "assets/icon.svg",
  "functions/api/state.js", "functions/api/health.js"
];
required.forEach(file => assert.ok(fs.existsSync(path.join(root, file)), `Fehlt: ${file}`));

execFileSync(process.execPath, ["--check", path.join(root, "assets/app.js")], {stdio: "inherit"});
execFileSync(process.execPath, ["--check", path.join(root, "functions/api/state.js")], {stdio: "inherit"});
execFileSync(process.execPath, ["--check", path.join(root, "functions/api/health.js")], {stdio: "inherit"});
execFileSync(process.execPath, ["--check", path.join(root, "sw.js")], {stdio: "inherit"});

const sandbox = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, "assets/seed.js"), "utf8"), sandbox);
const seed = sandbox.window.RADPROMPT_SEED;
assert.equal(seed.schemaVersion, 2);
assert.equal(seed.prompts.length, 9);
assert.ok(seed.folders.length >= 7);
assert.ok(seed.resources.schaeferCT.length > 10000);
assert.ok(seed.resources.schaeferMRT.length > 10000);
assert.ok(seed.prompts.some(prompt => prompt.content.includes("***Modalität***")));
assert.ok(seed.prompts.filter(prompt => prompt.includeSchaeferExamples).length >= 2);

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.ok(html.includes('id="promptDialog"'));
assert.ok(html.includes('id="folderTree"'));
assert.ok(html.includes('id="promptGrid"'));
assert.ok(!html.includes("http://"));

const css = fs.readFileSync(path.join(root, "assets/styles.css"), "utf8");
assert.ok(css.includes("grid-template-columns:repeat(4"));
assert.ok(css.includes("prefers-reduced-motion"));
assert.ok(css.includes("@media(max-width:460px)"));

console.log(`Smoke test erfolgreich: ${seed.prompts.length} Prompts, ${seed.folders.length} Ordner.`);
