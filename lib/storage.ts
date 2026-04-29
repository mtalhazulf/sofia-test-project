import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";

// Adapter so we can swap in S3 later by implementing the same interface.
export interface ReportStorage {
  put(relativePath: string, data: Buffer): Promise<string>; // returns canonical path
  exists(relativePath: string): Promise<boolean>;
  readStream(relativePath: string): NodeJS.ReadableStream;
}

const STORAGE_ROOT = path.resolve(process.cwd(), "storage");

class LocalStorage implements ReportStorage {
  async put(relativePath: string, data: Buffer): Promise<string> {
    const target = path.join(STORAGE_ROOT, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
    return relativePath;
  }
  async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(STORAGE_ROOT, relativePath));
      return true;
    } catch {
      return false;
    }
  }
  readStream(relativePath: string): NodeJS.ReadableStream {
    return createReadStream(path.join(STORAGE_ROOT, relativePath));
  }
}

export const storage: ReportStorage = new LocalStorage();

export function reportPath(clientId: string, snapshotId: string, kind: "SACS" | "TCC") {
  return path.posix.join("reports", clientId, snapshotId, `${kind.toLowerCase()}.pdf`);
}
