import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SharedMapService } from '../../services/shared-map.service';
import Print from "@arcgis/core/widgets/Print";
import WebMap from '@arcgis/core/WebMap';

@Component({
  selector: 'esri-print-component',
  templateUrl: './esri.print.component.html'
})
export class EsriPrintComponent implements OnInit, OnDestroy {
  @ViewChild('printNode', { static: true }) private printNode!: ElementRef;
  widget: any;

  constructor(private sharedMapService: SharedMapService, private router: Router) {
    this.sharedMapService.loadMapImageLayerComplete$.subscribe((param: any) => {
      if (param === 'TRUE') {
        if (this.sharedMapService.view.map instanceof WebMap) {
          this.sharedMapService.view.map.when(() => {
            this.addPrintWidget();
          });
        }
      }
    });
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  addPrintWidget(): void {
    if (this.printNode.nativeElement.children.length === 0) {
      const config = this.sharedMapService.config.widgets.find((widget: any) => widget.dataPanelId === 'print').config;
      this.widget = new Print({
        view: this.sharedMapService.view,
        container: this.printNode.nativeElement,
        templateOptions: config
      });
    } else {
      this.widget.view = this.sharedMapService.view;
    }
  }

}
