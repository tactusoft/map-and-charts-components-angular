import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CmpExtactDataComponent } from './cmp-extact-data.component';

describe('CmpExtactDataComponent', () => {
  let component: CmpExtactDataComponent;
  let fixture: ComponentFixture<CmpExtactDataComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CmpExtactDataComponent]
    });
    fixture = TestBed.createComponent(CmpExtactDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
