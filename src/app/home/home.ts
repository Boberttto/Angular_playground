import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PLAYGROUND_MODULES } from '../modules/modules.registry';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export default class Home {
  protected readonly modules = PLAYGROUND_MODULES;
}
