import { test, expect } from '@playwright/test';
import { getScenario, openReport } from './helpers';
import { getPackageVersion } from '../../../src/utils';

const pwVersion = getPackageVersion('@playwright/test');

test.beforeEach(async ({ page }) => {
  await openReport(page);
});

test('Scenario: timeout in before fixture', async ({ page }) => {
  const scenario = getScenario(page, 'timeout in before fixture');
  await expect(scenario.getSteps()).toContainText([
    'GivenAction 0',
    'Givenstep that uses timeouted before fixture',
    'WhenAction 1',
  ]);
  // 1. position of error message sometimes appears in After Hooks, so check it separately
  // 2. here can be different error messages
  await expect(scenario.getSteps()).toContainText([/Hook "fixture: (.+)" failed/]);
  // screenshot position changes between PW versions, so check it separately
  await expect(scenario.getSteps()).toContainText(['screenshot']);
  // sometimes error is the following:
  // "browser.newContext: Target page, context or browser has been closed"
  // in that case there are two errors in test report.
  expect(await scenario.getSteps('failed').count()).toBeGreaterThan(0);
  await expect(scenario.getSteps('skipped')).toHaveCount(3);
  await expect(scenario.getErrors()).toContainText([
    // here can be two different error messages
    // eslint-disable-next-line max-len
    /(Test timeout of \d+ms exceeded while setting up "timeoutedBeforeFixture")|(browser has been closed)|(Browser closed)/,
  ]);
});

test('Scenario: timeout in step', async ({ page }) => {
  const scenario = getScenario(page, 'timeout in step');
  await expect(scenario.getSteps()).toContainText([
    'GivenAction 0',
    'Giventimeouted step',
    'WhenAction 1',
    'screenshot',
  ]);
  // don't check passed/skipped steps counts b/c in different PW versions it's different
  await expect(scenario.getErrors()).toContainText([/Test timeout of \d+ms exceeded/]);
});

test('Scenario: timeout in after fixture', async ({ page }) => {
  // See: link to issue
  if (pwVersion.startsWith('1.43.')) return test.skip();
  const scenario = getScenario(page, 'timeout in after fixture');
  await expect(scenario.getSteps()).toContainText([
    'GivenAction 0',
    'Givenstep that uses timeouted after fixture',
    'WhenAction 1',
    'Hook "After Hooks" failed: Unknown location',
  ]);
  await expect(scenario.getSteps()).toContainText(['screenshot']);
  await expect(scenario.getSteps('passed')).toHaveCount(3);
  await expect(scenario.getSteps('failed')).toHaveCount(1);
  await expect(scenario.getErrors()).toContainText(['Test finished within timeout']);
  await expect(scenario.getErrors()).toContainText([
    'but tearing down "timeoutedAfterFixture" ran out of time',
  ]);
});

test('Scenario: timeout in step and in after fixture', async ({ page }) => {
  const scenario = getScenario(page, 'timeout in step and in after fixture');
  await expect(scenario.getSteps()).toContainText([
    'GivenAction 0',
    'Giventimeouted step',
    'WhenAction 1',
    'Givenstep that uses timeouted after fixture',
    'Hook "After Hooks" failed: Unknown location',
  ]);
  await expect(scenario.getSteps('passed')).toHaveCount(4);
  await expect(scenario.getSteps('failed')).toHaveCount(1);
  await expect(scenario.getErrors()).toContainText([/Test timeout of \d+ms exceeded/]);
});
