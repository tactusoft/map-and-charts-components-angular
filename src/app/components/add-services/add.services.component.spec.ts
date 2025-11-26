import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddServicesComponent } from './add.services.component';

describe('AddServicesComponent', () => {
  let component: AddServicesComponent;
  let fixture: ComponentFixture<AddServicesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddServicesComponent]
    });
    fixture = TestBed.createComponent(AddServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
