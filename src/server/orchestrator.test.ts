import test from 'node:test';
import assert from 'node:assert/strict';
import { orchestrator } from './orchestrator.js';

test('Orchestrator initializes with 4 distinct agents', () => {
  const state = orchestrator.getState();
  assert.equal(state.agents.length, 4);

  const roles = state.agents.map((a) => a.role);
  assert.ok(roles.includes('PLANNER'));
  assert.ok(roles.includes('DESIGNER'));
  assert.ok(roles.includes('BUILDER'));
  assert.ok(roles.includes('TESTER'));
});

test('Orchestrator tracks baseline tasks and logs', () => {
  const state = orchestrator.getState();
  assert.ok(state.tasks.length >= 2);
  assert.ok(state.logs.length >= 4);

  const p0Task = state.tasks.find((t) => t.id === 'TASK-P0-AUDIT');
  assert.ok(p0Task);
  assert.equal(p0Task?.status, 'VERIFIED');
});

test('Orchestrator completes 4-agent workflow on new task', async () => {
  const task = await orchestrator.runTaskWorkflow(
    'Implement Dynamic Price Revalidation',
    'PHASE 1',
    'HIGH'
  );

  assert.equal(task.status, 'VERIFIED');
  assert.ok(task.plannerOutput);
  assert.ok(task.designerOutput);
  assert.ok(task.builderOutput);
  assert.ok(task.testerOutput);
  assert.equal(task.testerOutput?.testsPassed, 4);
});
