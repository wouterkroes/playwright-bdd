/**
 * Class representing run of a test step.
 *
 * Each step has 4 related entities:
 * 1. pickle step -> how it is defined in Gherkin
 * 2. pwStep -> TestStep in Playwright test results (will be missing, if step didn't run)
 * 3. bddDataStep -> step info from bddData attachment (will be missing if step didn't run)
 * 4. messages.TestStep -> step info as a Cucumber message inside Cucumber's TestCase
 */
import * as pw from '@playwright/test/reporter';
import * as messages from '@cucumber/messages';
import { stripAnsiEscapes } from '../../../utils/stripAnsiEscapes';
import { TestCaseRun } from './TestCaseRun';
import { toCucumberTimestamp } from './timing';
import { TestStepAttachments } from './TestStepAttachments';

export type TestStepRunEnvelope = Pick<
  messages.Envelope,
  | 'testStepStarted' // prettier-ignore
  | 'testStepFinished'
  | 'attachment'
>;

export class TestStepRun {
  constructor(
    protected testCaseRun: TestCaseRun,
    protected testStep: messages.TestStep,
    protected pwStep: pw.TestStep | undefined,
  ) {}

  buildMessages(): TestStepRunEnvelope[] {
    const stepAttachments = new TestStepAttachments(this.testCaseRun, this.testStep, this.pwStep);
    return [
      this.buildTestStepStarted(), // prettier-ignore
      ...stepAttachments.buildMessages(),
      this.buildTestStepFinished(),
    ];
  }

  private wasExecuted(): this is { pwStep: pw.TestStep } {
    return Boolean(this.pwStep);
  }

  private get startTime() {
    return this.wasExecuted() ? this.pwStep.startTime : this.testCaseRun.result.startTime;
  }

  private get duration() {
    return this.wasExecuted() ? this.pwStep.duration : 0;
  }

  private buildTestStepStarted() {
    const testStepStarted: messages.TestStepStarted = {
      testCaseStartedId: this.testCaseRun.id,
      testStepId: this.testStep.id,
      timestamp: toCucumberTimestamp(this.startTime.getTime()),
    };
    return { testStepStarted };
  }

  private buildTestStepFinished() {
    const error = this.pwStep?.error;
    const errorOutput = error ? formatError(error) : undefined;
    const testStepFinished: messages.TestStepFinished = {
      testCaseStartedId: this.testCaseRun.id,
      testStepId: this.testStep.id,
      testStepResult: {
        duration: messages.TimeConversion.millisecondsToDuration(this.duration),
        status: this.getStatus(error),
        message: errorOutput,
        exception: error ? { message: errorOutput, type: 'Error' } : undefined,
      },
      timestamp: toCucumberTimestamp(this.startTime.getTime() + this.duration),
    };
    return { testStepFinished };
  }

  private getStatus(error?: pw.TestError): messages.TestStepResultStatus {
    switch (true) {
      case !this.wasExecuted():
        return messages.TestStepResultStatus.SKIPPED;
      case Boolean(error):
        return messages.TestStepResultStatus.FAILED;
      default:
        return messages.TestStepResultStatus.PASSED;
    }
  }
}

function formatError(error: pw.TestError) {
  return stripAnsiEscapes([error.message, error.snippet].filter(Boolean).join('\n'));
}
