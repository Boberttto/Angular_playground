import { Pipe, PipeTransform } from '@angular/core';

/** Pure pipe: easiest thing to unit test (no TestBed needed). */
@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, max = 20, suffix = '…'): string {
    if (!value) return '';
    return value.length > max ? value.slice(0, max).trimEnd() + suffix : value;
  }
}
