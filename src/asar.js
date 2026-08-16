import fs from "node:fs";

const ASAR_HEADER_SIZE = 16;

function isDirectory(entry) {
  return Boolean(entry?.files);
}

function walkFiles(entry, prefix = "") {
  if (!isDirectory(entry)) {
    return [{ path: prefix, entry }];
  }

  return Object.entries(entry.files).flatMap(([name, child]) =>
    walkFiles(child, `${prefix}/${name}`),
  );
}

export class AsarArchive {
  constructor(filePath) {
    this.filePath = filePath;
    this.fileHandle = fs.openSync(filePath, "r");
    this.header = this.readHeader();
    this.dataOffset = ASAR_HEADER_SIZE + this.header.jsonSize;
  }

  close() {
    fs.closeSync(this.fileHandle);
  }

  readHeader() {
    const header = Buffer.alloc(ASAR_HEADER_SIZE);
    fs.readSync(this.fileHandle, header, 0, header.length, 0);

    const jsonSize = header.readUInt32LE(12);
    const json = Buffer.alloc(jsonSize);
    fs.readSync(this.fileHandle, json, 0, json.length, ASAR_HEADER_SIZE);

    return {
      jsonSize,
      tree: JSON.parse(json.toString("utf8")),
    };
  }

  files() {
    return walkFiles(this.header.tree);
  }

  find(filePath) {
    const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
    return this.files().find(({ path }) => path === normalized) ?? null;
  }

  readFile(filePath) {
    const found = this.find(filePath);
    if (!found) {
      throw new Error(`File not found in archive: ${filePath}`);
    }

    const { entry } = found;
    if (entry.unpacked) {
      throw new Error(`File is unpacked and not stored in the archive: ${filePath}`);
    }

    const contents = Buffer.alloc(entry.size);
    fs.readSync(
      this.fileHandle,
      contents,
      0,
      contents.length,
      this.dataOffset + Number(entry.offset),
    );
    return contents;
  }
}

export function openArchive(filePath) {
  return new AsarArchive(filePath);
}
