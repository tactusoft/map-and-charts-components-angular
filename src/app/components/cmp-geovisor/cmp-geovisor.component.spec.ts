import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CmpGeovisorComponent } from './cmp-geovisor.component';

describe('CmpPruebaComponent', () => {
  let component: CmpGeovisorComponent;
  let fixture: ComponentFixture<CmpGeovisorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CmpGeovisorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CmpGeovisorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
