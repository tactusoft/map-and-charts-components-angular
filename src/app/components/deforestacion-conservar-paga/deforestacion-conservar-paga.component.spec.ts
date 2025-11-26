import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeforestacionConservarPagaComponent } from './deforestacion-conservar-paga.component';

describe('DeforestacionConservarPagaComponent', () => {
  let component: DeforestacionConservarPagaComponent;
  let fixture: ComponentFixture<DeforestacionConservarPagaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeforestacionConservarPagaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeforestacionConservarPagaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
