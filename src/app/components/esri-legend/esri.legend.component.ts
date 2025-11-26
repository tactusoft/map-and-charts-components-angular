import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SharedMapService } from '../../services/shared-map.service';
import Legend from "@arcgis/core/widgets/Legend";
import WebMap from '@arcgis/core/WebMap';

@Component({
  selector: 'esri-legend-component',
  templateUrl: './esri.legend.component.html',
  styleUrls: ['./esri.legend.component.scss'],
})
export class EsriLegendComponent implements OnInit, OnDestroy {
  @ViewChild('legendNode', { static: true }) private legendNode!: ElementRef;
  private widget: any;

  constructor(private sharedMapService: SharedMapService, private router: Router) {
    this.sharedMapService.loadMapImageLayerComplete$.subscribe((param: any) => {
      if (param === 'TRUE') {
        if (this.sharedMapService.view.map instanceof WebMap) {
          this.sharedMapService.view.map.when(() => {
            this.addLegendWidget();
          });
        }
      }
    });
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  addLegendWidget(): void {
    if (this.legendNode.nativeElement.children.length === 0) {
      this.widget = new Legend({
        view: this.sharedMapService.view,
        container: this.legendNode.nativeElement,
      });
    } else {
      this.widget.view = this.sharedMapService.view;
    }
  }

}
