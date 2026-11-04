import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PLAYGROUND_MODULES } from '../../modules/modules.registry';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly modules = PLAYGROUND_MODULES;
}
