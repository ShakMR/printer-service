import { execFile as nodeExecFile } from 'node:child_process';
import { promisify } from 'node:util';

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface CommandRunner {
  run(command: string, args: string[]): Promise<CommandResult>;
}

const execFile = promisify(nodeExecFile);

export const productionCommandRunner: CommandRunner = {
  async run(command, args) {
    const result = await execFile(command, args, {
      encoding: 'utf8',
      env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
    });
    return { stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
  },
};
