import { NgTemplateOutlet } from '@angular/common';
import { Component } from '@angular/core';
import { PanelCard } from './panel-card';
import { SmartList } from './smart-list';

interface User {
  readonly name: string;
  readonly role: string;
}

/** ng-template + ngTemplateOutlet (with context) and advanced content projection. */
@Component({
  selector: 'app-template-demo',
  imports: [NgTemplateOutlet, SmartList, PanelCard],
  templateUrl: './template-demo.html',
})
export class TemplateDemo {
  protected readonly users: readonly User[] = [
    { name: 'Ada', role: 'admin' },
    { name: 'Linus', role: 'dev' },
    { name: 'Grace', role: 'dev' },
  ];
  protected readonly tags = ['signals', 'defer', 'zoneless'];
}
