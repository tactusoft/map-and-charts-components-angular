// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';

import { AppComponent } from './app/app.component';
import { CmpGeovisorComponent } from './app/components/cmp-geovisor/cmp-geovisor.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .then(appRef => {
    const injector = appRef.injector;

    // Registrar el Web Component del geovisor
    const geovisorElement = createCustomElement(CmpGeovisorComponent, { injector });

    if (!customElements.get('wecmp-geovisor-mapa')) {
      customElements.define('wecmp-geovisor-mapa', geovisorElement);
    }
  })
  .catch(err => console.error(err));
