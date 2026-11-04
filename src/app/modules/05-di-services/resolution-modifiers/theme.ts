import { InjectionToken } from '@angular/core';

/** A plain string token, provided at different levels of the element tree. */
export const THEME = new InjectionToken<string>('THEME');

/** Never provided anywhere → shows `optional: true` returning null. */
export const NOT_PROVIDED = new InjectionToken<string>('NOT_PROVIDED');
