import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SharedMapService } from '../../services/shared-map.service';
import Swipe from "@arcgis/core/widgets/Swipe";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import WebMap from '@arcgis/core/WebMap';
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import Color from "@arcgis/core/Color";
import GroupLayer from '@arcgis/core/layers/GroupLayer';

@Component({
  selector: 'geovisor-swipe-component',
  templateUrl: './geovisor.swipe.component.html',
  styleUrls: ['./geovisor.swipe.component.scss']
})
export class GeovisorSwipeComponent implements OnInit, OnDestroy {
  loading: boolean = false;
  swipe: any;

  level: any;
  layers: any[] = [];
  currentLayer: any;
  layer: any;
  layer1: any;
  layer2: any;
  period1: any;
  layers1: any[] = [];
  period2: any;
  layers2: any[] = [];

  urlNacional: string = '';
  redToYellowGradient: string[];
  indexredToYellowGradient: number = 0;

  constructor(private sharedMapService: SharedMapService, private router: Router) {
    this.redToYellowGradient = this.generateGradientColors({ r: 255, g: 255, b: 0 }, { r: 255, g: 0, b: 0 }, 17);
    this.sharedMapService.loadMapImageLayerComplete$.subscribe((param: any) => {
      if (param === 'TRUE') {
        if (this.sharedMapService.view.map instanceof WebMap) {
          this.sharedMapService.view.map.when(() => {
            this.sharedMapService.view.map.layers.forEach((layer: any) => {
              if (layer instanceof GroupLayer) {
                layer.allLayers.forEach((lyr: any) => {
                  this.layers1.push({ label: lyr.title, value: lyr.id });
                  this.layers.push({ id: lyr.id, layer: lyr });
                  if (layer.visible) {
                    this.currentLayer = lyr;
                  }
                });
              } else {
                this.layers1.push({ label: layer.title, value: layer.id });
                this.layers.push({ id: layer.id, layer: layer });
                if (layer.visible) {
                  this.currentLayer = layer;
                }
              }
            });
          });
        }
      }
    });
  }

  ngOnInit() {

  }

  updateRenderer(layer: any): void {
    if (this.sharedMapService.config.topic === 'CAMBIO_COBERTURA') {
      var renderer = new UniqueValueRenderer({
        field: "ClassName"
      });

      const colors = [
        { ClassName: "Bosque Estable", Color: [60, 137, 69, 255] },
        { ClassName: "Deforestación", Color: [255, 0, 0, 255] },
        { ClassName: "Sin Información", Color: [255, 164, 0, 255] },
        { ClassName: "Regeneración", Color: [0, 0, 255, 255] },
        { ClassName: "No Bosque Estable", Color: [255, 255, 224, 255] }
      ];

      colors.forEach(function (item) {
        renderer.addUniqueValueInfo({
          value: item.ClassName,
          symbol: new SimpleFillSymbol({
            color: new Color(item.Color),
            outline: {
              color: new Color([255, 255, 255, 0.5]),
              width: 1
            }
          })
        });
      });

      layer.renderer = renderer;
    } else if (this.sharedMapService.config.topic === 'DEFORESTACION') {
      var renderer = new UniqueValueRenderer({
        field: "ClassName"
      });

      const colors = [
        { ClassName: "Deforestación", Color: this.redToYellowGradient[this.indexredToYellowGradient] },
      ];

      colors.forEach(function (item) {
        renderer.addUniqueValueInfo({
          value: item.ClassName,
          symbol: new SimpleFillSymbol({
            color: new Color(item.Color),
            outline: {
              color: new Color([255, 255, 255, 0.5]),
              width: 1
            }
          })
        });
      });

      layer.renderer = renderer;
      this.indexredToYellowGradient += 1;
    }
  }

  updateRendererSurface(layer: any): void {
    var renderer = new UniqueValueRenderer({
      field: "ClassName"
    });

    const colors = [
      { ClassName: "Bosque", Color: [60, 137, 69, 255] },
      { ClassName: "No Bosque", Color: [255, 255, 224, 255] },
      { ClassName: "Sin Información", Color: [255, 164, 0, 255] },
    ];

    colors.forEach(function (item) {
      renderer.addUniqueValueInfo({
        value: item.ClassName,
        symbol: new SimpleFillSymbol({
          color: new Color(item.Color),
          outline: {
            color: new Color([255, 255, 255, 0.5]),
            width: 1
          }
        })
      });
    });

    layer.renderer = renderer;
  }

  onChangeLayer1(event: Event) {
    this.period1 = (event.target as HTMLInputElement).value;
    this.layers2 = this.layers1.filter((item: any) => item.value !== this.period1);
  }

  onChangeLayer2(event: Event) {
    this.period2 = (event.target as HTMLInputElement).value;
  }

  onActivateClick(): void {
    if (this.period1 && this.period2) {
      if (this.swipe) {
        this.sharedMapService.view.ui.remove(this.swipe);
      }
      this.hideLayers();
      this.layer1 = (this.layers.filter((item: any) => item.id === this.period1)[0]).layer;
      this.layer1.visible = true;
      this.layer2 = (this.layers.filter((item: any) => item.id === this.period2)[0]).layer;
      this.layer2.visible = true;

      this.sharedMapService.showHideLabels(true, this.layer1.title, this.layer2.title);

      this.swipe = new Swipe({
        leadingLayers: [this.layer1],
        trailingLayers: [this.layer2],
        position: 50,
        view: this.sharedMapService.view
      });
      this.sharedMapService.view.ui.add(this.swipe);
    } else {
      this.sharedMapService.showWarningAlert('Todos los datos son obligatorios!');
    }
  }

  onClearClick(): void {
    this.period1 = '';
    this.period2 = '';
    this.swipe.destroy();
    this.sharedMapService.view.ui.remove(this.swipe);
    this.setElementValue('control-layer1', '');
    this.setElementValue('control-layer2', '');
    this.hideLayers();
    this.currentLayer.visible = true;
    this.sharedMapService.showHideLabels(false)
  }

  hideLayers(): void {
    for (let item of this.layers) {
      item.layer.visible = false;
      item.layer.load();
    }
  }

  ngOnDestroy() {
  }

  comparePeriods(a: any, b: any) {
    const yearA = parseInt(a.label.split('-')[0]);
    const yearB = parseInt(b.label.split('-')[0]);
    return yearB - yearA;
  }
  setElementValue(idElement: string, value: any) {
    const element = document.querySelector('#' + idElement) as HTMLInputElement | null;
    if (element != null) {
      element.value = value;
    }
  }

  generateGradientColors(startColor: { r: number, g: number, b: number }, endColor: { r: number, g: number, b: number }, steps: number): string[] {
    let colors: string[] = [];
    for (let i = 0; i < steps; i++) {
      let progress = i / (steps - 1);
      let adjustedProgress = Math.pow(progress, 0.5);
      let g = startColor.g + ((endColor.g - startColor.g) * adjustedProgress);

      let r = Math.max(0, Math.min(255, startColor.r + ((endColor.r - startColor.r) * progress)));
      let b = Math.max(0, Math.min(255, startColor.b + ((endColor.b - startColor.b) * progress)));

      g = Math.round(g);
      colors.push(`rgb(${r}, ${g}, ${b})`);
    }

    return colors;
  }
}
