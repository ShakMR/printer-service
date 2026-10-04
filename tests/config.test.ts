import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('configuration', () => {
  it('runs with safe defaults and accepts command-line overrides', () => {
    const config = loadConfig({}, ['--port', '4100', '--max-upload-bytes=20971520', '--log-level', 'debug']);
    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(4100);
    expect(config.maxUploadBytes).toBe(20971520);
    expect(config.logLevel).toBe('debug');
  });
});
