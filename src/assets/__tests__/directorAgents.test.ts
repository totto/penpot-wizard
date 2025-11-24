import { describe, it, expect } from 'vitest';
import { directorAgents } from '../directorAgents';

describe('directorAgents', () => {
  it('includes dump-selection tool id for the penpot-wizard director', () => {
    const dir = directorAgents.find(d => d.id === 'penpot-wizard');
    expect(dir).toBeDefined();
    expect(dir?.toolIds).toContain('dump-selection');
  });
});
