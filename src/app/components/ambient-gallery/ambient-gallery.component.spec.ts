import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmbientGalleryComponent } from './ambient-gallery.component';

describe('GalleryComponent', () => {
  let component: AmbientGalleryComponent;
  let fixture: ComponentFixture<AmbientGalleryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AmbientGalleryComponent]
    });
    fixture = TestBed.createComponent(AmbientGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
