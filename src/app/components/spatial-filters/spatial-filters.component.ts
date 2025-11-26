import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import { SharedMapService } from '../../services/shared-map.service';
import * as query from '@arcgis/core/rest/query';
import Query from '@arcgis/core/rest/support/Query';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import Polygon from '@arcgis/core/geometry/Polygon';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel';

@Component({
  selector: 'app-spatial-filters',
  templateUrl: './spatial-filters.component.html',
  styleUrls: ['./spatial-filters.component.scss'],
})
export class SpatialFiltersComponent implements OnInit, OnDestroy {

  @ViewChild('spFilterComponent') spFilterComponent!: ElementRef;
  @ViewChild('layerFilterComponent') layerFilterComponent!: ElementRef;

  loading: boolean = false;
  openConfirmation: boolean = false;
  urlLayer: string = '';
  geoJSONLayer: any;
  disabledLoadButton: boolean = false;
  disabledSaveButton: boolean = true;
  layers: any[] = [];
  layerViews: any[] = [];
  layer: any;
  layerView: any;
  feature: any;
  count: number = 0;
  sketchLayer: any;
  sketchViewModel: any;
  spFilters = [
    { value: 1, label: 'Extensión actual' },
    { value: 5, label: 'Zona definida por el usuario' },
    { value: 6, label: 'Cargar archivo' },
    { value: 4, label: 'Región', srv: 'REGIONES' },
    { value: 2, label: 'Departamento', srv: 'DEPARTAMENTOS' },
    { value: 7, label: 'Municipios', srv: 'MUNICIPIOS' },
    { value: 3, label: 'Limites autoridades ambientales', srv: 'CAR' },
  ];
  spFilter: any = { value: 0, label: 'Default' };
  municipios: any[] = [];
  departamentos: any[] = [];
  cars: any[] = [];
  ecoregiones: any[] = [];
  pointSymbol: any = { type: 'simple-marker', size: 6, color: 'purple' };
  polygonSymbol: any = {
    type: 'simple-fill',
    color: 'purple',
    style: 'backward-diagonal',
    outline: {
      color: 'purple',
      width: 3,
    },
  };
  polylineSymbol: any = { type: 'simple-line', size: 6, color: 'purple' };
  results: any;
  tableStatus: boolean = false;

  constructor(
    private sharedMapService: SharedMapService,
    private router: Router,
  ) {
    this.sketchLayer = new GraphicsLayer({
      id: 'mads-sketchLayer',
      title: 'Capa Temporal de Dibujo para filtros',
      listMode: 'hide'
    });
    this.sharedMapService.view.map.add(this.sketchLayer);

    this.sharedMapService.view.watch('extent', (newExtent: any) => {
      if (this.spFilter.value == 1) {
        this.feature = newExtent;
      }
    });

    this.sketchViewModel = new SketchViewModel({
      layer: this.sketchLayer,
      view: this.sharedMapService.view,
      pointSymbol: this.pointSymbol,
      polylineSymbol: this.polylineSymbol,
      polygonSymbol: this.polygonSymbol,
      defaultCreateOptions: { hasZ: false },
    });

    this.sketchViewModel.on(['create'], (event: any) => {
      if (event.state == 'complete') {
        this.feature = event.graphic.geometry;
      }
    });

    this.sharedMapService.loadMapImageLayerComplete$.subscribe((param: any) => {
      console.log('loadMapImageLayerComplete');
      if (param === 'TRUE') {
        console.log('loadLayers');
        this.loadLayers();
      }
    });
  }

  ngOnInit() {

  }

  ngOnDestroy() {

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

  onFilterClick(): void {
    if (this.layerView && this.feature) {
      this.loading = true;
      const geom = this.spFilter.srv ? this.feature.geometry : this.feature;
      const queryParamas = new Query({
        outFields: ['*'],
        returnGeometry: false,
        geometry: geom,
        spatialRelationship: 'intersects',
      });
      console.log('qParams', queryParamas);
      this.layerView.filter = {
        geometry: geom,
        spatialRelationship: 'intersects',
      };
      query
        .executeQueryJSON(
          this.layer.url + '/' + this.layer.layerId,
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
    this.sketchLayer.removeAll();
    this.layerView.filter = null;
    this.count = 0;
    this.toggleFeatureTable(false);
    this.spFilter.value = 0;

    (this.spFilterComponent.nativeElement as HTMLCalciteSelectElement).value = '';
    (this.layerFilterComponent.nativeElement as HTMLCalciteSelectElement).value = '';
  }

  onChangeService(event: Event) {
    const id = (event.target as HTMLInputElement).value;
    this.layer = this.layers.filter((item: any) => item.id === id)[0];
    this.layerView = this.layerViews.filter(
      (item: any) => item.layer.id === id
    )[0];
    console.log('spF-layer', this.layerView, this.layer);
  }

  onChangeSpFilter(event: Event) {
    this.spFilter = (event.target as HTMLInputElement).value;
    console.log('spFilter', this.spFilter);
    let fId = this.spFilter.value;
    console.log('spFilter', fId);
    switch (fId) {
      case 1:
        this.feature = this.sharedMapService.view.extent;
        this.sharedMapService.graphicsLayer.removeAll();
        break;
      case 2:
        if (this.departamentos.length == 0) {
          this.loadSelectData(this.spFilter.srv);
        }
        break;
      case 3:
        if (this.cars.length == 0) {
          this.loadSelectData(this.spFilter.srv);
        }
        break;
      case 4:
        if (this.ecoregiones.length == 0) {
          this.loadSelectData(this.spFilter.srv);
        }
        break;
      case 5:
        this.feature = null;
        break;
      case 6:
        this.feature = null;
        this.sharedMapService.graphicsLayer.removeAll();
        break;
      case 7:
        if (this.municipios.length == 0) {
          this.loadSelectData(this.spFilter.srv);
        }
        break;
    }
  }

  onChangeFilterGeom(event: Event) {
    this.sharedMapService.graphicsLayer.removeAll();
    this.feature = (event.target as HTMLInputElement).value;
    console.log('spF-featureIn', this.feature);
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

  loadLayers(): void {
    this.layers = [];
    this.layerViews = [];
    this.loading = true;
    const webmap: any = this.sharedMapService.view?.map;

    if (webmap) {
      webmap.loadAll().then(() => {
        const layerPromises = webmap.layers.map((layer: any) => {
          if (layer instanceof FeatureLayer) {
            return layer.load()
              .then(() => {
                this.layers.push(layer);
                return this.sharedMapService.view.whenLayerView(layer)
                  .then((layerView) => {
                    this.layerViews.push(layerView);
                  })
                  .catch((error) => {
                    console.error(`Error creating layerView for ${layer.id}:`, error);
                    return null;
                  });
              })
              .catch((error) => {
                console.error(`Error loading layer ${layer.id}:`, error);
                return null;
              });
          } else {
            return Promise.resolve(null);
          }
        });

        Promise.all(layerPromises).then(() => {
          this.loading = false;
        }).catch((error) => {
          console.error("Error during layer loading:", error);
          this.loading = false;
        });
      }).catch((error: any) => {
        console.error("Error loading webmap:", error);
        this.loading = false;
      });
    }
  }


  loadSelectData(source: string): void {
    this.loading = true;
    const lyObj: any = this.sharedMapService.config.settings.base_services.find(
      (service: { id: string }) => service.id === source
    );
    console.log(lyObj);
    const queryParams = new Query({
      outFields: ['*'],
      returnGeometry: true,
      where: `1=1`,
      outSpatialReference: this.sharedMapService.view.spatialReference,
    });
    query
      .executeQueryJSON(lyObj.url, queryParams)
      .then((results) => {
        if (results.features.length > 0) {
          results.features.forEach((feature: any) => {
            switch (source) {
              case 'DEPARTAMENTOS':
                this.departamentos.push(feature);
                break;
              case 'MUNICIPIOS':
                this.municipios.push(feature);
                break;
              case 'CAR':
                this.cars.push(feature);
                break;
              case 'REGIONES':
                this.ecoregiones.push(feature);
                break;
              default:
                break;
            }
          });

          this.departamentos = this.departamentos.sort((a, b) => {
            const nameA = a.attributes.DeNombre.toUpperCase();
            const nameB = b.attributes.DeNombre.toUpperCase();

            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }
            return 0;
          });

          this.municipios = this.municipios.sort((a, b) => {
            const nameA = a.attributes.MpNombre.toUpperCase();
            const nameB = b.attributes.MpNombre.toUpperCase();

            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }
            return 0;
          });
        };

        this.loading = false;
      })
      .catch((error: any) => {
        console.error(error);
        this.loading = false;
      });
  }

  pointFilterClick() {
    this.sketchLayer.removeAll();
    this.sketchViewModel.create('point');
  }

  lineFilterClick() {
    this.sketchLayer.removeAll();
    this.sketchViewModel.create('polyline');
  }

  polyFilterClick() {
    this.sketchLayer.removeAll();
    this.sketchViewModel.create('polygon');
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('sfFileInput');
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: any) {
    this.loading = true;
    const file: File = event.target.files[0];
    console.log('fileInput', event);
    const extension = file.name.split('.')?.pop()?.toLowerCase();
    if (extension == 'zip') {
      this.loading = true;
      //this.generateFeatures(file, 'shapefile', null);
      this.generateFeatureCollection(file);
    }
  }

  generateFeatureCollection(file: any) {
    console.log('fileInput', file);
    const url = 'https://www.arcgis.com/sharing/rest/content/features/generate';
    const params = {
      name: file.name,
      targetSR: this.sharedMapService?.view?.spatialReference,
      maxRecordCount: 1000,
      enforceInputFileSizeLimit: true,
      enforceOutputJsonSizeLimit: true,
      generalize: true,
      maxAllowableOffset: 10,
      reducePrecision: true,
      numberOfDigitsAfterDecimal: 0,
    };

    const formdata = new FormData();
    formdata.append('filetype', 'shapefile');
    formdata.append('publishParameters', JSON.stringify(params));
    formdata.append('f', 'json');
    formdata.append('file', file);

    fetch(url, {
      method: 'post',
      body: formdata,
    })
      .then((response) => {
        return response.json();
      })
      .then((response) => {
        if (response) {
          if (response.error) {
            console.log(response.error);
            this.sharedMapService.showErrorAlert(response.error);
            this.loading = false;
            return;
          }
        }
        console.log(response.featureCollection);
        let symbol;
        let geometry;
        let geometries = [];
        for (let feat of response.featureCollection.layers[0].featureSet
          .features) {
          console.log(feat);
          if (
            response.featureCollection.layers[0].featureSet.geometryType ===
            'esriGeometryPoint' ||
            response.featureCollection.layers[0].featureSet.geometryType ===
            'esriGeometryMultiPoint'
          ) {
            symbol = this.pointSymbol;
            geometry = new Point(feat.geometry);
          } else if (
            response.featureCollection.layers[0].featureSet.geometryType ===
            'esriGeometryPolyline'
          ) {
            symbol = this.polylineSymbol;
            geometry = new Polyline(feat.geometry);
          } else {
            symbol = this.polygonSymbol;
            geometry = new Polygon(feat.geometry);
          }
          geometries.push(geometry);
          const graphic = new Graphic({
            geometry: geometry,
            symbol,
          });
          this.sharedMapService.graphicsLayer.add(graphic);
        }
        this.feature = geometryEngine.union(geometries);
        this.sharedMapService.view.goTo(
          this.sharedMapService.graphicsLayer.graphics
        );
        this.loading = false;
      })
      .catch((error) => {
        console.log(error);
        this.loading = false;
      });
  }

  setElementValue(idElement: string, value: any) {
    const element = document.querySelector('#' + idElement) as HTMLInputElement | null;
    if (element != null) {
      element.value = value;
    }
  }

}
