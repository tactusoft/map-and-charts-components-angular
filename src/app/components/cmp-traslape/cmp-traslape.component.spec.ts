import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CmpTraslapeComponent } from './cmp-traslape.component';

describe('CmpTraslapeComponent', () => {
  let component: CmpTraslapeComponent;
  let fixture: ComponentFixture<CmpTraslapeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CmpTraslapeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CmpTraslapeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
