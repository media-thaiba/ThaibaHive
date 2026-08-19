import { actionRegistry, ActionRegistry } from '@/lib/security/soar/action-registry';
import { SoarActionHandler } from '@/lib/security/soar/soar-types';

describe('ActionRegistry', () => {
  beforeEach(() => {
    actionRegistry.clear();
  });

  it('should register and retrieve action handlers', () => {
    const mockAction: SoarActionHandler = {
      name: 'mock_action',
      description: 'Mock action for testing',
      execute: jest.fn().mockResolvedValue({ success: true }),
      compensate: jest.fn().mockResolvedValue(undefined),
    };

    actionRegistry.registerAction(mockAction);

    expect(actionRegistry.hasAction('mock_action')).toBe(true);
    expect(actionRegistry.getAction('mock_action')).toBe(mockAction);
  });

  it('should reject registration of unnamed actions', () => {
    expect(() => {
      actionRegistry.registerAction({} as any);
    }).toThrow('Action handler must have a valid name');
  });

  it('should list all registered actions with compensation metadata', () => {
    const action1: SoarActionHandler = {
      name: 'action_with_comp',
      description: 'Has compensate',
      execute: jest.fn(),
      compensate: jest.fn(),
    };
    const action2: SoarActionHandler = {
      name: 'action_no_comp',
      description: 'No compensate',
      execute: jest.fn(),
    };

    actionRegistry.registerAction(action1);
    actionRegistry.registerAction(action2);

    const list = actionRegistry.listActions();
    expect(list).toHaveLength(2);
    expect(list.find(a => a.name === 'action_with_comp')?.hasCompensate).toBe(true);
    expect(list.find(a => a.name === 'action_no_comp')?.hasCompensate).toBe(false);
  });
});
