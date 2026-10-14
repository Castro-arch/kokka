import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseEnv, storageEnvSchema } from "./env.ts";
import { createStorage } from "./storage.ts";

const offline = createStorage({
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "kokka",
  S3_ACCESS_KEY_ID: "key",
  S3_SECRET_ACCESS_KEY: "secret",
  S3_FORCE_PATH_STYLE: true,
});

describe("signedGetUrl", () => {
  it("signs a path-style url that expires", async () => {
    const url = new URL(await offline.signedGetUrl("events/ev1/cover/c1.webp", 120));
    expect(url.origin + url.pathname).toBe("http://localhost:9000/kokka/events/ev1/cover/c1.webp");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("120");
    expect(url.searchParams.get("X-Amz-Signature")).toBeTruthy();
  });

  it("does not sign a body checksum into the url", async () => {
    const url = new URL(await offline.signedGetUrl("k"));
    const params = [...url.searchParams.keys()].map((key) => key.toLowerCase());
    expect(params.filter((key) => key.includes("checksum"))).toEqual([]);
  });

  it("asks for a download with a safe file name", async () => {
    const url = new URL(await offline.signedGetUrl("k", 60, { downloadName: 'kokka "foto".jpg' }));
    expect(url.searchParams.get("response-content-disposition")).toBe(
      'attachment; filename="kokka__foto_.jpg"',
    );
  });
});

describe("signUploadPart", () => {
  it("signs a part upload without a body checksum", async () => {
    const url = new URL(await offline.signUploadPart("events/e/original/m.mp4", "up-1", 3));
    expect(url.searchParams.get("partNumber")).toBe("3");
    expect(url.searchParams.get("uploadId")).toBe("up-1");
    const params = [...url.searchParams.keys()].map((key) => key.toLowerCase());
    expect(params.filter((key) => key.includes("checksum"))).toEqual([]);
  });
});

describe("presignMultipartRequest", () => {
  it("signs the content type of a multipart creation", async () => {
    const url = new URL(
      await offline.presignMultipartRequest({
        op: "create",
        key: "k.jpg",
        contentType: "image/jpeg",
      }),
    );
    expect(url.searchParams.has("uploads")).toBe(true);
    expect(url.searchParams.get("X-Amz-SignedHeaders")?.split(";")).toContain("content-type");
  });

  it("signs part uploads for the given upload and part", async () => {
    const url = new URL(
      await offline.presignMultipartRequest({
        op: "uploadPart",
        key: "k",
        uploadId: "u",
        partNumber: 2,
      }),
    );
    expect(url.searchParams.get("uploadId")).toBe("u");
    expect(url.searchParams.get("partNumber")).toBe("2");
  });
});

// Runs in CI against SeaweedFS; skipped locally unless the env is set.
const enabled = Boolean(process.env.S3_ENDPOINT);

describe.runIf(enabled)("storage round trip", () => {
  it("puts, reads through a signed url and deletes an object", async () => {
    const storage = createStorage(parseEnv(storageEnvSchema));
    const key = `test/${randomUUID()}.txt`;

    await storage.putObject(key, new TextEncoder().encode("olá"), {
      contentType: "text/plain; charset=utf-8",
    });
    const response = await fetch(await storage.signedGetUrl(key));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toBe("olá");

    await storage.deleteObject(key);
    expect((await fetch(await storage.signedGetUrl(key))).status).toBe(404);
  });

  it("uploads in parts through signed urls, as the browser does", async () => {
    const storage = createStorage(parseEnv(storageEnvSchema));
    const key = `test/${randomUUID()}.bin`;
    const first = new Uint8Array(5 * 1024 * 1024).fill(1);
    const last = new TextEncoder().encode("fim");

    const uploadId = await storage.createMultipartUpload(key, "application/octet-stream");
    for (const [index, body] of [first, last].entries()) {
      const response = await fetch(await storage.signUploadPart(key, uploadId, index + 1), {
        method: "PUT",
        body,
      });
      expect(response.status).toBe(200);
    }

    const parts = await storage.listParts(key, uploadId);
    expect(parts.map((part) => part.partNumber)).toEqual([1, 2]);
    await storage.completeMultipartUpload(key, uploadId, parts);
    expect(await storage.headObject(key)).toMatchObject({ size: first.length + last.length });

    const download = await fetch(await storage.signedGetUrl(key, 60, { downloadName: "x.bin" }));
    expect(download.headers.get("content-disposition")).toBe('attachment; filename="x.bin"');
    await download.arrayBuffer();

    await storage.deleteObject(key);
    expect(await storage.headObject(key)).toBeUndefined();
  });

  it("runs a multipart upload from presigned requests, as the uppy uploader does", async () => {
    const storage = createStorage(parseEnv(storageEnvSchema));
    const key = `test/${randomUUID()}.jpg`;
    const body = new TextEncoder().encode("foto");
    const xmlValue = (xml: string, tag: string) =>
      new RegExp(`<${tag}>([^<]+)</${tag}>`).exec(xml)?.[1];

    const created = await fetch(
      await storage.presignMultipartRequest({ op: "create", key, contentType: "image/jpeg" }),
      { method: "POST", headers: { "Content-Type": "image/jpeg" } },
    );
    expect(created.status).toBe(200);
    const uploadId = xmlValue(await created.text(), "UploadId") ?? "";

    const part = await fetch(
      await storage.presignMultipartRequest({ op: "uploadPart", key, uploadId, partNumber: 1 }),
      { method: "PUT", body },
    );
    const etag = part.headers.get("etag") ?? "";
    const listed = await fetch(
      await storage.presignMultipartRequest({ op: "listParts", key, uploadId }),
    );
    expect(xmlValue(await listed.text(), "PartNumber")).toBe("1");

    const completed = await fetch(
      await storage.presignMultipartRequest({ op: "complete", key, uploadId }),
      {
        method: "POST",
        body: `<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>${etag}</ETag></Part></CompleteMultipartUpload>`,
      },
    );
    expect(completed.status).toBe(200);
    await completed.text();
    expect(await storage.headObject(key)).toEqual({ size: body.length, contentType: "image/jpeg" });
    await storage.deleteObject(key);

    const otherKey = `test/${randomUUID()}.jpg`;
    const other = await storage.createMultipartUpload(otherKey, "image/jpeg");
    const aborted = await fetch(
      await storage.presignMultipartRequest({ op: "abort", key: otherKey, uploadId: other }),
      { method: "DELETE" },
    );
    expect(aborted.status).toBe(204);
  });

  it("aborts a multipart upload", async () => {
    const storage = createStorage(parseEnv(storageEnvSchema));
    const key = `test/${randomUUID()}.bin`;
    const uploadId = await storage.createMultipartUpload(key, "video/mp4");
    await storage.abortMultipartUpload(key, uploadId);
    await expect(storage.listParts(key, uploadId)).rejects.toThrow();
  });
});
