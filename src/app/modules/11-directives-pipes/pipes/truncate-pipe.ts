import { Pipe, PipeTransform } from '@angular/core';
import { truncate } from './truncate';

/**
 * Custom PURE pipe with arguments: {{ text | truncate: 10 : '…' }}
 * Pure (the default) = transform() re-runs only when the input value or an argument changes (===).
 * Docs: https://angular.dev/guide/templates/pipes#creating-custom-pipes
 */
@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit = 20, ellipsis = '…'): string {
    return truncate(value, limit, ellipsis);
  }
}
