import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EsriPrintComponent } from './esri.print.component';

describe('EsriPrintComponent', () => {
  let component: EsriPrintComponent;
  let fixture: ComponentFixture<EsriPrintComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EsriPrintComponent]
    });
    fixture = TestBed.createComponent(EsriPrintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
