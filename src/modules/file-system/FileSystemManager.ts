import fs from 'fs/promises';
import path from 'path';

export class FileSystemManager {
  async readFile(path: string): Promise<string> {
    await this.ensureDataDir(path);

    return fs.readFile(path, 'utf-8');
  }

  async writeFile(path: string, data: string): Promise<void> {
    return fs.writeFile(path, data, 'utf-8');
  }

  /**
   * Checks if the data directory exists and creates it if it does not.
   *
   * The data directory is determined by the path of the `SUBSCRIPTIONS_FILE`
   * constant. If the directory does not exist, it is created with the
   * `recursive` option set to `true`.
   */
  async ensureDataDir(pathToFile: string): Promise<void> {
    const dataDir = path.dirname(pathToFile);

    try {
      await fs.access(dataDir);
    } catch (error) {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }
}
