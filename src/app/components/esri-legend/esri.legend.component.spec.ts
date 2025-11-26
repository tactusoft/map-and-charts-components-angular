import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EsriLegendComponent } from './esri.legend.component';

describe('EsriLegendComponent', () => {
  let component: EsriLegendComponent;
  let fixture: ComponentFixture<EsriLegendComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EsriLegendComponent]
    });
    fixture = TestBed.createComponent(EsriLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
