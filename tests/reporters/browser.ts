import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import type {
  FullResult,
  Reporter,
  TestCase,
  TestError,
  TestResult,
} from '@playwright/test/reporter';

export default class BoundedBrowserReporter implements Reporter {
  private cases: {
    file: string;
    title: string;
    repeat: number;
    retry: number;
    status: string;
    error: string;
  }[] = [];
  private unhandledErrors = 0;
  private unhandledMessages: string[] = [];

  onError(error: TestError): void {
    this.unhandledErrors++;
    if (this.unhandledMessages.length < 16) {
      this.unhandledMessages.push(
        stripVTControlCharacters(error.message ?? error.value ?? 'Unspecified global error').slice(
          0,
          400,
        ),
      );
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.cases.push({
      file: relative(process.cwd(), test.location.file).replaceAll('\\', '/').slice(0, 120),
      title: test.title.slice(0, 180),
      repeat: test.repeatEachIndex,
      retry: result.retry,
      status: result.status,
      error: stripVTControlCharacters(result.errors[0]?.message ?? '').slice(0, 400),
    });
  }

  onEnd(result: FullResult): void {
    const counts = {
      total: this.cases.length,
      passed: this.cases.filter((test) => test.status === 'passed').length,
      failed: this.cases.filter((test) => test.status === 'failed' || test.status === 'timedOut')
        .length,
      skipped: this.cases.filter((test) => test.status === 'skipped').length,
      interrupted: this.cases.filter((test) => test.status === 'interrupted').length,
    };
    const report = {
      runner: 'playwright',
      status: result.status,
      counts,
      unhandledErrors: this.unhandledErrors,
      unhandledMessages: this.unhandledMessages,
      unhandledMessagesTruncated: this.unhandledErrors > this.unhandledMessages.length,
      truncated: this.cases.length > 64,
      cases: this.cases.slice(0, 64),
    };
    writeFileSync(
      new URL('../evidence/browser-review-red.json', import.meta.url),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      JSON.stringify({
        runner: report.runner,
        status: report.status,
        counts,
        unhandledErrors: report.unhandledErrors,
        unhandledMessages: report.unhandledMessages,
        unhandledMessagesTruncated: report.unhandledMessagesTruncated,
        truncated: report.truncated,
      }),
    );
  }
}
