import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mayUseWorkspaceLabels } from '../workspace-labels';

const option = (value: string[], allowedRolesForCreation?: string[]) => ({ title: value.join(), description: '', value, allowedRolesForCreation });
const options = [
  option(['customer']),
  option(['team', 'eu'], ['*']),
  option(['partner'], ['partner-manager']),
  option(['customer', 'vip'], ['sales']),
  option(['hidden'], []),
];

describe('mayUseWorkspaceLabels', () => {
  describe('when labels are required', () => {
    const config = { allowNonLabeledWorkspaces: false, labels: options };
    const may = (labels: string[], roles = ['user']) => mayUseWorkspaceLabels(config, labels, roles);

    it('should accept an option the user may choose, in any order', () => {
      assert.equal(may(['customer']), true);
      assert.equal(may(['eu', 'team']), true);
      assert.equal(may(['partner'], ['partner-manager']), true);
      assert.equal(may(['vip', 'customer'], ['user', 'sales']), true);
    });

    it('should refuse labels that are not an option', () => {
      assert.equal(may(['other']), false);
      assert.equal(may(['team', 'other']), false);
      assert.equal(may(['team', 'team']), false);
      assert.equal(may([]), false);
    });

    it('should refuse an option of other roles', () => {
      assert.equal(may(['partner']), false);
      assert.equal(may(['customer', 'vip']), false);
      assert.equal(may(['hidden']), false);
    });
  });

  describe('when labels are optional', () => {
    const may = (labels: string[], roles = ['user'], config = { allowNonLabeledWorkspaces: true, labels: options }) =>
      mayUseWorkspaceLabels(config, labels, roles);

    it('should accept no labels, open options and labels no option mentions', () => {
      assert.equal(may([]), true);
      assert.equal(may(['customer']), true);
      assert.equal(may(['anything']), true);
    });

    it('should refuse a label kept for other roles, also next to open ones', () => {
      assert.equal(may(['partner']), false);
      assert.equal(may(['vip']), false);
      assert.equal(may(['customer', 'vip']), false);
      assert.equal(may(['hidden']), false);
      assert.equal(may(['vip'], ['sales']), true);
    });

    it('should accept anything when no option is defined', () => {
      assert.equal(may(['vip'], ['user'], { allowNonLabeledWorkspaces: true, labels: [] }), true);
      assert.equal(may(['vip'], ['user'], { allowNonLabeledWorkspaces: true, labels: undefined as any }), true);
    });
  });
});
