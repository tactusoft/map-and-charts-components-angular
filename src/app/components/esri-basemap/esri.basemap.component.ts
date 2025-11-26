import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SharedMapService } from '../../services/shared-map.service';
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import WebMap from '@arcgis/core/WebMap';

@Component({
  selector: 'esri-basemap-component',
  templateUrl: './esri.basemap.component.html'
})
export class EsriBasemapComponent implements OnInit, OnDestroy {
  @ViewChild('basempasNode', { static: true }) private basempasNode!: ElementRef;
  widget: any;

  constructor(private sharedMapService: SharedMapService, private router: Router) {
    this.sharedMapService.loadMapImageLayerComplete$.subscribe((param: any) => {
      if (param === 'TRUE') {
        if (this.sharedMapService.view.map instanceof WebMap) {
          this.sharedMapService.view.map.when(() => {
            this.addBasemapGalleryWidget();
          });
        }
      }
    });
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  addBasemapGalleryWidget(): void {
    if (this.basempasNode.nativeElement.children.length === 0) {
      this.widget = new BasemapGallery({
        view: this.sharedMapService.view,
        container: this.basempasNode.nativeElement,
      });
    } else {
      this.widget.view = this.sharedMapService.view;
    }
  }

}
