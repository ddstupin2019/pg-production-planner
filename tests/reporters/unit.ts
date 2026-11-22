import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import type { Reporter, SerializedError, TestModule, TestRunEndReason } from 'vitest/node';

// Reporting only: no result overrides, configuration changes, retries or test filtering.
export default class BoundedUnitReporter implements Reporter {
  onTestRunEnd(
    modules: readonly TestModule[],
    errors: readonly SerializedError[],
    reason: TestRunEndReason,
  ): void {
    const cases = modules.flatMap((module) =>
      [...module.children.allTests()].map((test) => ({
        file: relative(process.cwd(), module.moduleId).replaceAll('\\', '/').slice(0, 120),
        title: test.fullName.slice(0, 180),
        state: test.result().state,
        error: stripVTControlCharacters(test.result().errors?.[0]?.message ?? '').slice(0, 240),
      })),
    );
    const counts = {
      total: cases.length,
      passed: cases.filter((test) => test.state === 'passed').length,
      failed: cases.filter((test) => test.state === 'failed').length,
      other: cases.filter((test) => test.state !== 'passed' && test.state !== 'failed').length,
    };
    const report = {
      runner: 'vitest',
      reason,
      counts,
      unhandledErrors: errors.length,
      moduleErrors: modules.reduce((n, module) => n + module.errors().length, 0),
      truncated: cases.length > 256,
      cases: cases.slice(0, 256),
    };
    writeFileSync(
      new URL('../evidence/unit-review-red.json', import.meta.url),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      JSON.stringify({
        runner: report.runner,
        reason,
        counts,
        unhandledErrors: report.unhandledErrors,
        moduleErrors: report.moduleErrors,
        truncated: report.truncated,
      }),
    );
  }
}
