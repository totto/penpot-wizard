import { describe, it, expect, vi } from 'vitest';
import { ClientQueryType, MessageSourceName } from '@/types/types';

// This test verifies the plugin router registered in src/plugin/plugin.ts
// and dispatches incoming client messages to the appropriate handler.
describe('plugin router integration', () => {
  it('dispatches SET_SELECTION_OPACITY and sends response via penpot.ui.sendMessage', async () => {
    // Create mocks and a handler capture
    let handler: any = null;
    const sendSpy = vi.fn();

    // Provide a minimal penpot global expected by plugin.ts when it registers handlers
    (globalThis as any).penpot = {
      on: vi.fn(),
      theme: 'light',
      ui: {
        open: vi.fn(),
        onMessage: (cb: any) => { handler = cb; },
        sendMessage: sendSpy,
      },
      // Provide a direct selection proxy so the handler's getSelectionForAction finds something
      selection: [{ id: 'shape-1', name: 'Rect', opacity: 1, type: 'rect' }],
      currentPage: {
        getShapeById: (id: string) => ({ id, name: `shape-${id}`, opacity: 1, type: 'rect' }),
      },
    };

    // Ensure we reset cached modules so the plugin re-registers using our mocked penpot
    vi.resetModules();
    // Import the plugin module so it registers the onMessage handler
    await import('@/plugin/plugin');
    expect(typeof handler).toBe('function');

    // Simulate a client message for SET_SELECTION_OPACITY
    const message = {
      source: MessageSourceName.Client,
      type: ClientQueryType.SET_SELECTION_OPACITY,
      messageId: 'msg-1',
      payload: { opacity: 0.5 },
    } as any;

    // Call handler and wait for it to process
    await handler(message);

    // We expect the plugin to have sent a response via penpot.ui.sendMessage
    expect(sendSpy).toHaveBeenCalled();

    const resp = sendSpy.mock.calls[0][0];
    expect(resp).toBeTruthy();
    expect(resp.type).toBe(ClientQueryType.SET_SELECTION_OPACITY);
    // plugin should report changedShapeIds and appliedOpacity for the selection
    expect(resp.payload).toBeTruthy();
    expect(Array.isArray(resp.payload.changedShapeIds)).toBe(true);
    expect(resp.payload.appliedOpacity).toBe(0.5);
  });

  it('dispatches TOGGLE_SELECTION_LOCK and sends response via penpot.ui.sendMessage', async () => {
    // Create mocks and a handler capture
    let handler: any = null;
    const sendSpy = vi.fn();

    // Provide a minimal penpot global expected by plugin.ts when it registers handlers
    (globalThis as any).penpot = {
      on: vi.fn(),
      theme: 'light',
      ui: {
        open: vi.fn(),
        onMessage: (cb: any) => { handler = cb; },
        sendMessage: sendSpy,
      },
      // Provide a direct selection proxy so the handler's getSelectionForAction finds something
      selection: [ { id: 'shape-lock-1', name: 'Box', locked: false, type: 'rect' } ],
      currentPage: {
        getShapeById: (id: string) => ({ id, name: `shape-${id}`, locked: false, type: 'rect' }),
      },
    };

    // Ensure we reset cached modules so the plugin re-registers using our mocked penpot
    vi.resetModules();
    // Import the plugin module so it registers the onMessage handler
    await import('@/plugin/plugin');
    expect(typeof handler).toBe('function');

    // Simulate a client message for TOGGLE_SELECTION_LOCK (force lock)
    const message = {
      source: MessageSourceName.Client,
      type: ClientQueryType.TOGGLE_SELECTION_LOCK,
      messageId: 'msg-2',
      payload: { lock: true },
    } as any;

    // Call handler and wait for it to process
    await handler(message);

    // We expect the plugin to have sent a response via penpot.ui.sendMessage
    expect(sendSpy).toHaveBeenCalled();

    const resp = sendSpy.mock.calls[0][0];
    expect(resp).toBeTruthy();
    expect(resp.type).toBe(ClientQueryType.TOGGLE_SELECTION_LOCK);
    expect(resp.success).toBe(true);
    // plugin should include lockedShapes and undoInfo when locking
    expect(resp.payload).toBeTruthy();
    expect(Array.isArray(resp.payload.lockedShapes)).toBe(true);
    expect(resp.payload.undoInfo).toBeTruthy();
    expect(Array.isArray(resp.payload.undoInfo.undoData.shapeIds)).toBe(true);
  });
});
