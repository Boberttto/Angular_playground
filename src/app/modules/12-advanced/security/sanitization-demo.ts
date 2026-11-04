import { Component, inject, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Angular treats every bound value as untrusted and sanitizes it for its context
 * (HTML, style, URL, resource URL).
 * Docs: https://angular.dev/best-practices/security
 */
@Component({
  selector: 'app-sanitization-demo',
  templateUrl: './sanitization-demo.html',
})
export class SanitizationDemo {
  private readonly sanitizer = inject(DomSanitizer);

  /** Imagine this comes from a user / an API. */
  protected readonly untrusted = `<b>Bold is fine</b> <img src="x" onerror="alert('XSS')"> <script>alert('XSS')</script>`;
  protected readonly untrustedUrl = `javascript:alert('XSS')`;

  /** What Angular will keep (same algorithm as the [innerHTML] binding). */
  protected readonly sanitizedPreview = this.sanitizer.sanitize(SecurityContext.HTML, this.untrusted);

  /**
   * bypassSecurityTrust* disables sanitization. Only for values YOU control (constants, server
   * HTML you already sanitized) — never for user input.
   */
  protected readonly trustedConstant: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(
    '<span style="color: #7b2cbf">Inline style kept because the value was explicitly trusted</span>',
  );
}
