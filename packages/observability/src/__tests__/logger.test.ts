import { describe, expect, it } from 'vitest';

import { createLogger } from '../index.js';

describe('StructuredLogger', () => {
  it('emits valid JSON in json mode', () => {
    const lines: string[] = [];
    const logger = createLogger({ format: 'json', level: 'info', sink: (l) => lines.push(l) });
    logger.info('device added', { deviceId: 'd1' });
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.level).toBe('info');
    expect(parsed.msg).toBe('device added');
    expect(parsed.deviceId).toBe('d1');
    expect(parsed.time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('emits pretty lines in pretty mode', () => {
    const lines: string[] = [];
    const logger = createLogger({ format: 'pretty', level: 'info', sink: (l) => lines.push(l) });
    logger.warn('something happened', { code: 42 });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/\[warn\] something happened/);
  });

  it('respects the level filter', () => {
    const lines: string[] = [];
    const logger = createLogger({ format: 'json', level: 'warn', sink: (l) => lines.push(l) });
    logger.info('skip me');
    logger.error('keep me', { code: 1 });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!).level).toBe('error');
  });

  it('child loggers inherit and extend bindings', () => {
    const lines: string[] = [];
    const parent = createLogger({ format: 'json', level: 'info', bindings: { service: 'bff' }, sink: (l) => lines.push(l) });
    const child = parent.child({ requestId: 'r1' });
    child.info('child message');
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.service).toBe('bff');
    expect(parsed.requestId).toBe('r1');
  });
});
