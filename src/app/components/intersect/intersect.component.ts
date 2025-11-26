import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import { SharedMapService } from '../../services/shared-map.service';
import * as query from '@arcgis/core/rest/query';
import Query from '@arcgis/core/rest/support/Query';
import Graphic from '@arcgis/core/Graphic';

@Component({
  selector: 'intersect-component',
  templateUrl: './intersect.component.html',
  styleUrls: ['./intersect.component.scss'],
})
export class IntersectComponent implements OnInit, OnDestroy {
  loading: boolean = false;

  layers: any[] = [];
  layer: any;
  fields: any[] = [];
  field: any;
  values: any[] = [];
  value: any;
  intersectLayers: any[] = [];
  intersectLayer: any;
  feature: any;
  count: number = 0;

  pointSymbol: any = { type: 'simple-marker', size: 6, color: 'black' };
  polygonSymbol: any = {
    type: 'simple-fill',
    color: 'purple',
    style: 'backward-diagonal',
    outline: {
      color: 'purple',
      width: 3,
    },
  };
  polylineSymbol: any = { type: 'simple-line', size: 6, color: 'white' };

  results: any;
  tableStatus: boolean = false;

  constructor(
    private sharedMapService: SharedMapService,
    private router: Router
  ) {
    this.sharedMapService.loadMapImageLayerComplete$.subscribe((param: any) => {
      if (param === 'TRUE') {
        this.loadLayers();
      }
    });
  }

  ngOnInit() {}

  onChangeService(event: Event) {
    this.sharedMapService.graphicsLayer.removeAll();
    this.feature = null;
    const id = (event.target as HTMLInputElement).value;
    this.layer = this.layers.filter((item: any) => item.id === id)[0];
    this.intersectLayers = this.layers.filter((item: any) => item.id !== id);
    this.getFields();
  }

  onChangeField(event: Event) {
    this.sharedMapService.graphicsLayer.removeAll();
    this.field = (event.target as HTMLInputElement).value;
    this.queryDistinctValues();
  }

  onChangeValue(event: Event) {
    this.sharedMapService.graphicsLayer.removeAll();
    this.value = (event.target as HTMLInputElement).value;

    this.zoomToValue();
  }

  onChangeIntesectLayers(event: Event) {
    const id = (event.target as HTMLInputElement).value;
    this.intersectLayer = this.intersectLayers.filter(
      (item: any) => item.id === id
    )[0];
  }

  onIntersectClick(): void {
    //this.intersectLayer &&
    if (this.feature) {
      this.loading = true;
      const queryParamas = new Query({
        outFields: ['*'],
        returnGeometry: true,
        geometry: this.feature.geometry,
      });
      query
        .executeQueryJSON(
          this.intersectLayer
            ? this.intersectLayer.url + '/' + this.intersectLayer.layerId
            : this.layer.url + '/' + this.layer.layerId,
          queryParamas
        )
        .then((results) => {
          if (results.features.length > 0) {
            console.log('results.features', results.features);
            this.results = results;
            this.count = results.features.length;
            this.loading = false;
            this.tableStatus = false;
            this.toggleFeatureTable(this.tableStatus);
          }
        });
    } else {
    }
  }

  onClearClick(): void {
    this.sharedMapService.graphicsLayer.removeAll();
    this.count = 0;
  }

  ngOnDestroy() {}

  loadLayers(): void {
    this.layers = [];
    this.loading = true;
    const webmap: any = this.sharedMapService.view?.map;

    if (webmap) {
      console.log(webmap.allLayers.items.map((l: any) => [l.name]));

      webmap
        .loadAll()
        .then(() => {
          const layerPromises = webmap.layers.map((layer: any) => {
            return layer.load().catch((error: any) => {
              console.error(`Error loading layer ${layer.id}:`, error);
              return null;
            });
          });
          Promise.all(layerPromises).then((loadedLayers) => {
            loadedLayers.forEach((layer: any) => {
              if (layer && layer instanceof FeatureLayer) {
                this.layers.push(layer);
                //              console.log("layer.id", layer.id, layer.declaredClass);
              }
            });
            this.layers.sort((a: FeatureLayer, b: FeatureLayer) =>
              a.title.localeCompare(b.title)
            );
            this.loading = false;
          });
        })
        .catch((error: any) => {
          console.error('Error loading webmap:', error);
          this.loading = false;
        });
    }
  }

  getFields(): void {
    this.loading = true;
    this.fields = [];
    for (const field of this.layer.fields) {
      if (!field.name.toUpperCase().includes('SHAPE')) {
        const fieldInfo = {
          value: field.name,
          label: field.alias,
        };
        this.fields.push(fieldInfo);
      }
    }
    this.loading = false;
  }

  queryDistinctValues(): void {
    this.loading = true;
    this.values = [];
    const queryParamas = new Query({
      outFields: [this.field],
      returnGeometry: false,
      where: '1=1',
      returnDistinctValues: true,
    });
    query
      .executeQueryJSON(this.layer.url + '/' + this.layer.layerId, queryParamas)
      .then((results) => {
        for (const feature of results.features) {
          this.values.push({
            label: feature.attributes[this.field],
            value: feature.attributes[this.field],
          });
        }

        this.values.sort((a: any, b: any) => {
          const typeA =
            typeof a === 'object' && 'label' in a ? 'string' : typeof a;
          const typeB =
            typeof b === 'object' && 'label' in b ? 'string' : typeof b;

          if (typeA === typeB) {
            if (typeA === 'string') {
              return a.label.localeCompare(b.label);
            }
            return a - b;
          }

          return typeA === 'number' ? -1 : 1;
        });
        this.loading = false;
      });
  }

  zoomToValue() {
    this.loading = true;
    const queryParamas = new Query({
      outFields: [this.field.includes('Depto') ? 'DeNombre' : this.field],
      returnGeometry: true,
      where: this.field.includes('Depto')
        ? `DeNombre = '${this.value}'`
        : `${this.field} = '${this.value}'`,
      outSpatialReference: this.sharedMapService.view.spatialReference,
    });
    console.log(this.field, this.field.includes('Depto'));

    let url = this.field.includes('Depto')
      ? `${
          (
            this.layers.filter(
              (item: any) => item.title == 'Departamentos'
            )[0] as FeatureLayer
          ).url
        }/0`
      : this.layer.url + '/' + this.layer.layerId;

    query.executeQueryJSON(url, queryParamas).then((results) => {
      if (results.features.length > 0) {
        this.feature = results.features[0];
        let symbol;
        if (
          this.feature.geometry.type === 'point' ||
          this.feature.geometry.type === 'multipoint'
        ) {
          symbol = this.pointSymbol;
        } else if (this.feature.geometry.type === 'polyline') {
          symbol = this.polylineSymbol;
        } else {
          symbol = this.polygonSymbol;
        }
        const graphic = new Graphic({
          geometry: this.feature.geometry,
          symbol,
        });
        this.sharedMapService.graphicsLayer.add(graphic);
        this.sharedMapService.view.goTo(
          this.sharedMapService.graphicsLayer.graphics
        );
      }
      this.loading = false;
    });
  }

  toggleFeatureTable(showTable: boolean) {
    showTable
      ? this.sharedMapService.tableContainer.classList.remove('hidden-table')
      : this.sharedMapService.tableContainer.classList.add('hidden-table');
  }

  async createTable(results: any) {
    this.sharedMapService.featureTable.layer = new FeatureLayer({
      source: results.features.map(
        (result: any) =>
          new Graphic({
            geometry: result.geometry,
            attributes: result.attributes,
          })
      ),
      title: this.layer.title,
      fields: results.fields,
      objectIdField: 'FID',
    });
  }

  showTable() {
    this.tableStatus = true;

    this.createTable(this.results).then(() => {
      this.toggleFeatureTable(this.tableStatus);
    });
  }
}
