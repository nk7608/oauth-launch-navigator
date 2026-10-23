// Tiny JSON key-value store for live plans, runs and limits.
// Vercel Blob (private store) when BLOB_READ_WRITE_TOKEN is set; a git-ignored .data/ folder otherwise.
import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

export interface Store {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const safe = (key: string) => key.replace(/[^a-z0-9/_.-]/gi, "_");

const fileStore: Store = {
  async get(key) {
    try {
      return JSON.parse(await readFile(path.join(DATA_DIR, safe(key)), "utf8"));
    } catch {
      return undefined;
    }
  },
  async set(key, value) {
    if (process.env.VERCEL) throw new Error("Connect a private Vercel Blob store before saving live research.");
    const file = path.join(DATA_DIR, safe(key));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(value, null, 1));
  },
  async delete(key) {
    await rm(path.join(DATA_DIR, safe(key)), { force: true });
  },
};

const blobStore: Store = {
  async get(key) {
    try {
      const res = await get(safe(key), { access: "private", useCache: false });
      if (!res || res.statusCode !== 200) return undefined;
      return JSON.parse(await new Response(res.stream).text());
    } catch {
      return undefined;
    }
  },
  async set(key, value) {
    await put(safe(key), JSON.stringify(value), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  },
  async delete(key) {
    try {
      await del(safe(key));
    } catch {
      /* already gone */
    }
  },
};

export const store: Store = process.env.BLOB_READ_WRITE_TOKEN ? blobStore : fileStore;
