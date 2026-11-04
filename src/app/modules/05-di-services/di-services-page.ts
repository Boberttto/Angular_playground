import { Component } from '@angular/core';
import { DemoSection } from '../../shared/demo-section/demo-section';
import { PageHeader } from '../../shared/page-header/page-header';
import { EnvInjectorDemo } from './env-injector/env-injector-demo';
import { InstanceScope } from './instance-scope/instance-scope';
import { ProviderRecipes } from './provider-recipes/provider-recipes';
import { ModifierParent } from './resolution-modifiers/modifier-parent';
import { ThemeReader } from './resolution-modifiers/theme-reader';
import { ViewProvidersHost } from './resolution-modifiers/view-providers-host';

@Component({
  selector: 'app-di-services-page',
  imports: [
    PageHeader,
    DemoSection,
    InstanceScope,
    EnvInjectorDemo,
    ProviderRecipes,
    ModifierParent,
    ViewProvidersHost,
    ThemeReader,
  ],
  templateUrl: './di-services-page.html',
  styleUrl: './di-services-page.scss',
})
export default class DiServicesPage {}
