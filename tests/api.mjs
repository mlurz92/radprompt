import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "functions/api/state.js"), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const api = await import(moduleUrl);

class MemoryKV {
  constructor(initial = {}) { this.map = new Map(Object.entries(initial)); }
  async get(key, type) {
    const value = this.map.get(key);
    if (value == null) return null;
    return type === "json" ? JSON.parse(value) : value;
  }
  async put(key, value) { this.map.set(key, String(value)); }
}

const stamp = "2026-07-10T10:00:00.000Z";
const legacy = {
  schemaVersion: 1, revision: 7, updatedAt: stamp,
  folders: [{id: "f1", name: "Legacy", parentId: null, order: 0, updatedAt: stamp}],
  prompts: [{id: "p1", title: "Legacy Prompt", content: "Text", folderId: "f1", order: 0, updatedAt: stamp}],
  resources: {schaeferCT: "CT", schaeferMRT: "MRT"}
};
const kv = new MemoryKV({"radprompt:state:v1": JSON.stringify(legacy)});
const env = {RADPROMPT_KV: kv};

const getLegacy = await api.onRequestGet({env});
assert.equal(getLegacy.status, 200);
const legacyRead = await getLegacy.json();
assert.equal(legacyRead.schemaVersion, 2);
assert.equal(legacyRead.prompts[0].title, "Legacy Prompt");

const incoming = structuredClone(legacyRead);
incoming.prompts.push({id: "p2", title: "Neu", content: "***Modalität***", folderId: "f1", order: 1, createdAt: stamp, updatedAt: "2026-07-10T11:00:00.000Z"});
incoming.updatedAt = "2026-07-10T11:00:00.000Z";
const put = await api.onRequestPut({
  env,
  request: new Request("https://example.test/api/state", {method: "PUT", headers: {"content-type": "application/json"}, body: JSON.stringify(incoming)})
});
assert.equal(put.status, 200);
const saved = await put.json();
assert.equal(saved.prompts.length, 2);
assert.equal(saved.revision, 8);
assert.ok(kv.map.has("radprompt:state:v2"));

const tombstoneInput = structuredClone(saved);
tombstoneInput.prompts = tombstoneInput.prompts.filter(item => item.id !== "p1");
tombstoneInput.tombstones.prompts.p1 = "2026-07-10T12:00:00.000Z";
tombstoneInput.updatedAt = "2026-07-10T12:00:00.000Z";
const deletedResponse = await api.onRequestPut({
  env,
  request: new Request("https://example.test/api/state", {method: "PUT", headers: {"content-type": "application/json"}, body: JSON.stringify(tombstoneInput)})
});
const deleted = await deletedResponse.json();
assert.equal(deleted.prompts.some(item => item.id === "p1"), false);
assert.equal(deleted.prompts.some(item => item.id === "p2"), true);

const emptyKv = new MemoryKV();
const empty = await api.onRequestGet({env: {RADPROMPT_KV: emptyKv}});
assert.equal(empty.status, 204);

console.log("API-Test erfolgreich: Legacy-Migration, Merge und Tombstones geprüft.");
