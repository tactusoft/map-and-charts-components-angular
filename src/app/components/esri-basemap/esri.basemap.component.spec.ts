import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EsriBasemapComponent } from './esri.basemap.component';

describe('EsriBasemapComponent', () => {
  let component: EsriBasemapComponent;
  let fixture: ComponentFixture<EsriBasemapComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EsriBasemapComponent]
    });
    fixture = TestBed.createComponent(EsriBasemapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
