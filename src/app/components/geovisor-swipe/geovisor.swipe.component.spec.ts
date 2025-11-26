import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CimaSwipeComponent } from './geovisor.swipe.component';

describe('CimaSwipeComponent', () => {
  let component: CimaSwipeComponent;
  let fixture: ComponentFixture<CimaSwipeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CimaSwipeComponent]
    });
    fixture = TestBed.createComponent(CimaSwipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
