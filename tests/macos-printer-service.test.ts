import { describe, expect, it } from 'vitest';
import { CommandRunner } from '../src/services/command-runner';
import { MacosPrinterService, parseLpstatPrinters } from '../src/services/macos-printer-service';

describe('parseLpstatPrinters', () => {
  it('parses enabled, disabled, spaced, and malformed lines', () => {
    expect(parseLpstatPrinters('printer Office Laser is idle. enabled since today\nprinter Lab Printer disabled since today\nnot printer data')).toEqual([
      { id: 'Office Laser', name: 'Office Laser', available: true },
      { id: 'Lab Printer', name: 'Lab Printer', available: false },
    ]);
  });
});

describe('MacosPrinterService', () => {
  it('uses separate lp arguments and returns the request id', async () => {
    const calls: string[][] = [];
    const runner: CommandRunner = { run: async (command, args) => {
      calls.push([command, ...args]);
      if (command === 'lpstat') return { stdout: 'printer Office; Laser is idle.', stderr: '' };
      return { stdout: 'request id is Office-42 (1 file(s))', stderr: '' };
    }};
    const result = await new MacosPrinterService(runner).print('Office; Laser', '/tmp/a file.pdf');
    expect(result).toEqual({ accepted: true, jobId: 'Office-42' });
    expect(calls).toEqual([
      ['lpstat', '-p'],
      ['lp', '-d', 'Office; Laser', '/tmp/a file.pdf'],
    ]);
  });

  it('treats missing command output as empty text', async () => {
    const runner: CommandRunner = { run: async (command) => command === 'lpstat'
      ? ({ stdout: undefined as unknown as string, stderr: undefined as unknown as string })
      : ({ stdout: '', stderr: '' }) };
    await expect(new MacosPrinterService(runner).listPrinters()).resolves.toEqual([]);
  });
});
