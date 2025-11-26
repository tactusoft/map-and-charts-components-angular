import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EsriLayerListComponent } from './esri.layerlist.component';

describe('EsriLayerListComponent', () => {
  let component: EsriLayerListComponent;
  let fixture: ComponentFixture<EsriLayerListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EsriLayerListComponent]
    });
    fixture = TestBed.createComponent(EsriLayerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
