import { describe, expect, it, vi, beforeEach } from 'vitest';

const isTauriMock = vi.fn();
const saveMock = vi.fn();
const writeFileMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => isTauriMock(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: (options?: unknown) => saveMock(options),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: (path: string, bytes: Uint8Array) => writeFileMock(path, bytes),
}));

describe('downloadTextFile', () => {
  beforeEach(() => {
    isTauriMock.mockReset();
    saveMock.mockReset();
    writeFileMock.mockReset();
  });

  it('opens the native Save dialog defaulted to the given filename', async () => {
    isTauriMock.mockReturnValue(true);
    saveMock.mockResolvedValue(null);
    const { downloadTextFile } = await import('./downloadTextFile');

    await downloadTextFile(() => 'const a = 1;', 'code.js');

    expect(saveMock).toHaveBeenCalledWith({ defaultPath: 'code.js' });
  });

  it('does not call getContent before the dialog resolves', async () => {
    isTauriMock.mockReturnValue(true);
    let resolveSave!: (value: string | null) => void;
    saveMock.mockReturnValue(new Promise((resolve) => (resolveSave = resolve)));
    const getContent = vi.fn(() => 'const a = 1;');
    const { downloadTextFile } = await import('./downloadTextFile');

    const pending = downloadTextFile(getContent, 'code.js');
    expect(getContent).not.toHaveBeenCalled();

    resolveSave('/Users/me/Downloads/code.js');
    await pending;

    expect(getContent).toHaveBeenCalledTimes(1);
  });

  it('cancelling the dialog (null) never calls getContent or writes', async () => {
    isTauriMock.mockReturnValue(true);
    saveMock.mockResolvedValue(null);
    const getContent = vi.fn(() => 'const a = 1;');
    const { downloadTextFile } = await import('./downloadTextFile');

    await downloadTextFile(getContent, 'code.js');

    expect(getContent).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('confirming a destination writes the UTF-8-encoded content there', async () => {
    isTauriMock.mockReturnValue(true);
    saveMock.mockResolvedValue('/Users/me/Downloads/code.js');
    const { downloadTextFile } = await import('./downloadTextFile');

    await downloadTextFile(() => 'const a = 1;', 'code.js');

    expect(writeFileMock).toHaveBeenCalledWith(
      '/Users/me/Downloads/code.js',
      new TextEncoder().encode('const a = 1;')
    );
  });

  it('is a no-op in the non-Tauri (browser) runtime', async () => {
    isTauriMock.mockReturnValue(false);
    const getContent = vi.fn(() => 'const a = 1;');
    const { downloadTextFile } = await import('./downloadTextFile');

    await downloadTextFile(getContent, 'code.js');

    expect(saveMock).not.toHaveBeenCalled();
    expect(getContent).not.toHaveBeenCalled();
  });
});
