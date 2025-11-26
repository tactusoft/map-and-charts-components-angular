import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConservarPagaComponent } from './conservar.paga.component';

describe('AddServicesComponent', () => {
  let component: ConservarPagaComponent;
  let fixture: ComponentFixture<ConservarPagaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConservarPagaComponent]
    });
    fixture = TestBed.createComponent(ConservarPagaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
