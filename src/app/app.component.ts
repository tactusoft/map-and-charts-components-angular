import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { CmpGeovisorComponent } from './components/cmp-geovisor/cmp-geovisor.component';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    CmpGeovisorComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {
  title = 'geo-visor-cmp';
  selectedTopic: string = 'PILOTO';
  selectedRegion: string = '';

  onTopicChange(event: any) {
    this.selectedTopic = event.target.value;
  }

  onRegionChange(event: any) {
    this.selectedRegion = event.target.value;
  }
}