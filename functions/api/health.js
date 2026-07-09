export async function onRequestGet(context) {
  const h = context.data.radprompt;
  h.requireMethod(["GET", "HEAD"]);
  const started = Date.now();
  const kvBound = Boolean(h.kv());
  const state = { exists: false, readable: false, validJson: false, schema: "", version: 0, folders: 0, prompts: 0, favorites: 0, bytes: 0, updatedAt: "", seededAt: "", hash: "" };
  const probes = { binding: kvBound, read: false, write: false, delete: false, list: { supported: false, keys: 0, cursor: "", truncated: false } };
  const documents = { prompts: {}, schaeferCt: {}, schaeferMrt: {} };
  let message = "OK";
  if (kvBound) {
    try {
      const raw = await h.getKv(h.stateKey);
      probes.read = true;
      if (raw) {
        state.exists = true;
        state.bytes = h.byteLength(raw);
        const parsed = h.safeJsonParse(raw, null);
        if (parsed) {
          const normalized = h.normalizeState(parsed);
          state.readable = true;
          state.validJson = true;
          state.schema = normalized.schema;
          state.version = normalized.version;
          state.folders = normalized.folders.length;
          state.prompts = normalized.prompts.length;
          state.favorites = normalized.favorites.length;
          state.updatedAt = normalized.updatedAt;
          state.seededAt = normalized.meta.seededAt || "";
          state.hash = normalized.meta.hash || await h.hashJson({ ...normalized, meta: { ...normalized.meta, hash: "" } });
        } else {
          state.readable = false;
          state.validJson = false;
          message = "Der gespeicherte State ist kein gültiges JSON.";
        }
      }
      const probeKey = `radprompt:probe:${Date.now()}`;
      await h.putKv(probeKey, JSON.stringify({ ok: true, at: h.now() }), { expirationTtl: 60 });
      probes.write = true;
      await h.deleteKv(probeKey);
      probes.delete = true;
      const listed = await h.listKv({ prefix: "radprompt:", limit: 20 });
      probes.list = { supported: true, keys: listed.keys?.length || 0, cursor: listed.cursor || "", truncated: Boolean(listed.list_complete === false) };
    } catch (error) {
      message = error.message || String(error);
    }
  } else {
    message = "RADPROMPT_KV ist nicht gebunden. Im Cloudflare Pages Dashboard muss ein KV namespace binding mit dem Namen RADPROMPT_KV gesetzt werden.";
  }
  for (const [key, path] of Object.entries(h.dataAssets)) {
    try {
      documents[key] = await h.getAssetMeta(path);
      if (documents[key].readable) documents[key].hash = await h.hashText(await h.getAssetText(path));
    } catch (error) {
      documents[key] = { path, exists: false, readable: false, bytes: 0, error: error.message || String(error) };
    }
  }
  const ok = kvBound && probes.read && probes.write && probes.delete && probes.list.supported && documents.prompts.readable && documents.schaeferCt.readable && documents.schaeferMrt.readable;
  return h.json({ ok, kv: kvBound, state, probes, documents, message: ok ? "RadPrompt ist verbunden und betriebsbereit." : message, runtime: h.runtimeInfo(), timing: { durationMs: Date.now() - started } });
}
export async function onRequestHead(context) {
  const response = await onRequestGet(context);
  return new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers });
}
