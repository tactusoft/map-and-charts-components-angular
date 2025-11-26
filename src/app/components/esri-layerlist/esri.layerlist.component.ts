import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  Inject,
  Input,
} from '@angular/core';
import { Router } from '@angular/router';
import { SharedMapService } from '../../services/shared-map.service';
import LayerList from '@arcgis/core/widgets/LayerList';
import WebMap from '@arcgis/core/WebMap';
import Slider from '@arcgis/core/widgets/Slider';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

@Component({
  selector: 'esri-layerlist-component',
  templateUrl: './esri.layerlist.component.html',
  styleUrls: ['./esri.layerlist.component.scss'],
})
export class EsriLayerListComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild('layersNode', { static: true }) private layersNode!: ElementRef;
  widget: any;

  sliderContainer: any;

  constructor(
    private sharedMapService: SharedMapService,
    private router: Router
  ) {}

  ngOnInit() {}

  ngOnDestroy() {}

  ngAfterViewInit(): void {
    this.sharedMapService.loadMapImageLayerComplete$.subscribe((param: any) => {
      if (param === 'TRUE') {
        if (this.sharedMapService.view.map instanceof WebMap) {
          this.sharedMapService.view.map.when(() => {
            this.addLayerListWidget();
          });
        }
      }
    });
  }

  toggleFeatureTable(showTable: boolean) {
    showTable
      ? this.sharedMapService.tableContainer.classList.remove('hidden-table')
      : this.sharedMapService.tableContainer.classList.add('hidden-table');
  }

  async addLayerListWidget() {
    if (this.layersNode.nativeElement.children.length === 0) {
      this.widget = new LayerList({
        view: this.sharedMapService.view,
        container: this.layersNode.nativeElement,
        dragEnabled: true,
        listItemCreatedFunction: async (event: any) =>
          this.defineActions(event),
      });

      this.widget.on('trigger-action', (event: any) => {
        const id = event.action.id;
        const visibleLayer = event.item.layer;
        if (id === 'full-extent') {
          this.sharedMapService.view
            .goTo(visibleLayer.fullExtent)
            .catch((error) => {
              if (error.name != 'AbortError') {
                console.error(error);
              }
            });
        } else if (id === 'increase-opacity') {
          if (visibleLayer.opacity > 0) {
            visibleLayer.opacity -= 0.25;
          }
        } else if (id === 'decrease-opacity') {
          if (visibleLayer.opacity < 1) {
            visibleLayer.opacity += 0.25;
          }
        } else if (id === 'change-opacity') {
        } else if (id === 'information') {
          if (visibleLayer.url) {
            window.open(visibleLayer.url);
          }
        } else if (id === 'table') {
          if (this.sharedMapService.featureTable.layer) {
            if (
              visibleLayer.title !=
              this.sharedMapService.featureTable.layer.title
            ) {
              this.createTable(visibleLayer).then(() => {
                this.toggleFeatureTable(true);
              });
            } else {
              this.toggleFeatureTable(true);
            }
          } else {
            this.createTable(visibleLayer).then(() => {
              this.toggleFeatureTable(true);
            });
          }
        }
      });
    } else {
      this.widget.view = this.sharedMapService.view;
    }
  }

  async createTable(layer: any) {
    this.sharedMapService.featureTable.layer = layer;
  }

  async defineActions(event: any) {
    const { item } = event;
    await item.layer.when();

    item.actionsSections = [
      [
        {
          title: 'Ir a la extensión completa',
          className: 'esri-icon-zoom-out-fixed',
          id: 'full-extent',
        },
      ],
      this.sharedMapService.config.topic !== 'REGISTRO_SOLICITUDES' ? [
        {
          title: 'Información de la capa',
          icon: 'information',
          id: 'information',
        },
      ] : [],
      item.layer.type == 'feature' || item.layer.type == 'sublayer' ? [
        {
          title: 'Mostrar tabla',
          className: 'esri-icon-table',
          id: 'table',
          type: 'toggle',
        },
      ] : [],

      [
        /* {
          title: 'Ajustar transparencia',
          className: 'esri-icon-up',
          id: 'change-opacity',
        },
 {
          title: 'Aumentar transparencia',
          className: 'esri-icon-up',
          id: 'increase-opacity',
        },
        {
          title: 'Disminuir transparencia',
          className: 'esri-icon-down',
          id: 'decrease-opacity',
        }, */
      ],
    ];
    if (item.title.indexOf('Dibujo') > -1) {
      item.actionsSections = [
        [
          {
            title: 'Ir a la extensión completa',
            className: 'esri-icon-zoom-out-fixed',
            id: 'full-extent',
          },
        ],
        [
          {
            title: 'Aumentar transparencia',
            className: 'esri-icon-up',
            id: 'increase-opacity',
          },
          {
            title: 'Disminuir transparencia',
            className: 'esri-icon-down',
            id: 'decrease-opacity',
          },
        ],
      ];
    }

    //  if (item.children.length > 1 && item.parent) {

    const slider = new Slider({
      container: this.sliderContainer,
      label: 'Opacidad',
      min: 0,
      max: 1,
      precision: 2,
      values: [1],
      visibleElements: {
        labels: true,
        rangeLabels: true,
      },
    });

    item.panel = {
      content: slider,
      icon: 'transparency',
      title: 'Cambiar la transparencia',
    };

    reactiveUtils.watch(
      () => slider.values.map((value) => value),
      (values) => (item.layer.opacity = values[0])
    );

    //  }
  }
}
