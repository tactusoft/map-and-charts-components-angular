import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import Polygon from '@arcgis/core/geometry/Polygon';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import TileLayer from '@arcgis/core/layers/TileLayer';
import MapImageLayer from '@arcgis/core/layers/MapImageLayer';
import ImageryLayer from '@arcgis/core/layers/ImageryLayer';
import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import WMSLayer from '@arcgis/core/layers/WMSLayer';
import WFSLayer from '@arcgis/core/layers/WFSLayer';
import KMLLayer from '@arcgis/core/layers/KMLLayer';
import CSVLayer from '@arcgis/core/layers/CSVLayer';
import esriRequest from '@arcgis/core/request';
import { kml } from '@tmcw/togeojson';
import { SharedMapService } from '../../services/shared-map.service';
import * as geoprocessor from "@arcgis/core/rest/geoprocessor";

@Component({
  selector: 'add-services-component',
  templateUrl: './add.services.component.html',
  styleUrls: ['./add.services.component.scss'],
})
export class AddServicesComponent implements OnInit, OnDestroy {
  loading: boolean = false;

  gpUrl: string = 'https://geo.minambiente.gov.co/server/rest/services/Utils/uploadfiles/GPServer';
  urlRegex: string =
    '^(http|https)://[a-z0-9]+([-.]{1}[a-z0-9]+)*.[a-z]{2,5}(:[0-9]{1,5})?(/.*)?$';
  urlLayer: string = '';
  geoJSONLayer: any;
  buttonText: string = 'Cargar';

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

  serviceTypes = [
    { value: '1', label: 'Un servicio web de ArcGIS for Server' },
    { value: '2', label: 'Un servicio web de WMS OGC' },
    { value: '3', label: 'Un servicio Web de WFS OGC' },
    { value: '4', label: 'Un archivo KML' },
    { value: '5', label: 'Un archivo CSV' },
  ];

  serviceType: string = '';

  constructor(
    private sharedMapService: SharedMapService,
    private router: Router
  ) { }

  ngOnInit() { }

  createPopupTemplateFromFields(layer: any): any {
    if (layer.fields) {
      const fieldInfos = layer.fields.map((field: any) => ({
        fieldName: field.name,
        label: field.alias || field.name,
      }));

      return {
        title: layer.title || 'Atributos',
        content: [
          {
            type: 'fields',
            fieldInfos: fieldInfos,
          },
        ],
      };
    } else {
      return {};
    }
  }

  onFileSelected(event: any) {
    this.loading = true;
    this.buttonText = 'Procesando...';

    const input = event.target as HTMLInputElement;
    const file: File | undefined = input.files?.[0];

    if (file) {
      const extension = file.name.split('.')?.pop()?.toLowerCase();
      switch (extension) {
        case 'zip':
          this.addFile(file);
          break;
        case 'csv':
          this.addCsvFile(file);
          break;
        case 'kml':
          this.addKmlFile(file);
          break;
        case 'geojson':
        case 'geo.json':
          this.generateFeatures(file, 'geojson', null);
          break;
      }

      input.value = '';
    } else {
      this.loading = false;
      this.buttonText = 'Cargar';
      this.sharedMapService.showErrorAlert('No se seleccionó ningún archivo');
    }
  }

  generateUniqueFileName(baseName: string): string {
    const timestamp = new Date().getTime();
    return `${baseName}_${timestamp}`;
  }

  addFile(file: File): void {
    this.uploadFile(file)
      .then((itemID: string) => {
        const fileNameWithoutExtension: string = file.name.replace(/\.[^/.]+$/, "");
        this.addShapefileToMap(itemID, fileNameWithoutExtension);
      })
      .catch((error) => {
        this.loading = false;
        this.buttonText = 'Cargar';
        console.error('Error al subir el archivo o al obtener el itemID:', error);
      });
  }

  uploadFile(file: File): Promise<string> {
    const url = `${this.gpUrl}/uploads/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', 'Load Shapefiles');
    formData.append('f', 'json');

    return fetch(url, {
      method: 'POST',
      body: formData,
    })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          return result.item.itemID;
        } else {
          throw new Error('Error al cargar el archivo');
        }
      });
  }

  addShapefileToMap(itemID: string, fileName: string): void {
    const url = `${this.gpUrl}/Upload%20Files`;

    const params = {
      "zip_file": `{'itemID':'${itemID}'}`
    };

    geoprocessor.submitJob(url, params)
      .then((jobInfo) => {
        console.log('Job Info:', jobInfo);

        const options = {
          statusCallback: (jobStatusInfo: any) => {
            progTest(jobStatusInfo);
          },
        };

        jobInfo
          .waitForJobCompletion(options)
          .then((jobInfoCompleted) => {
            jobInfoCompleted.fetchResultData('results_feature')
              .then((data: any) => {

                const featureLayer = new FeatureLayer({
                  title: fileName,
                  fields: data.value.fields,
                  geometryType: data.value.geometryType,
                  source: data.value.features // Agregar los features obtenidos
                });

                this.sharedMapService.view.map.add(featureLayer);
                featureLayer.when(() => {
                  this.sharedMapService?.view?.goTo(featureLayer.fullExtent);
                  featureLayer.popupTemplate = this.createPopupTemplateFromFields(featureLayer);
                });
                this.sharedMapService.showSuccessAlert('Geometrías añadidas.');
                this.loading = false;
                this.buttonText = 'Cargar';
              })
              .catch((error) => {
                console.error('Error al obtener datos:', error);
                this.loading = false;
                this.buttonText = 'Cargar';
              });
          })
          .catch((error) => {
            console.log('Error al completar el trabajo:', error);
            console.log('Messages', error.messages.map((m: any) => [m.description, m.type]));
            this.loading = false;
            this.buttonText = 'Cargar';
          });
      })
      .catch((error) => {
        console.log(error);
        this.loading = false;
        this.buttonText = 'Cargar';
      });

    const progTest = (value: any) => {
      console.log(value.jobStatus);

      if (value.jobStatus == 'job-executing') {
        this.loading = true;
        this.buttonText = 'Procesando...';
      }
    };
  }

  addFeatureCollectionToMap(featureCollection: any): void {
    const layers: any = [];
    let fullExtent: any = null;
    let index = 0;
    const layersLength = featureCollection.layers.length;

    for (const layer of featureCollection.layers) {
      const featureLayer = new FeatureLayer({
        id: 'madsi-featureLayerShapefile',
        objectIdField: 'ObjectID',
        fields: layer.layerDefinition.fields.map((field: any) => ({
          name: field.name,
          alias: field.alias,
          type:
            field.name == 'FID' || field.name == 'OBJECTID' ? 'oid' : 'string',
          nullable: field.name != 'FID' || field.name == 'OBJECTID',
        })),
        //   title: featureCollection.layers[0].layerDefinition.name,
        title: layer.layerDefinition.name,
      });

      switch (layer.featureSet.geometryType) {
        case 'esriGeometryPoint':
          const rendererPoint: any = {
            type: 'simple',
            symbol: this.pointSymbol,
          };
          for (const feature of layer.featureSet.features) {
            feature.geometry = new Point({
              x: feature.geometry.x,
              y: feature.geometry.y,
              spatialReference: feature.geometry.spatialReference,
            });
          }
          featureLayer.renderer = rendererPoint;
          break;
        case 'esriGeometryPolygon':
          const rendererPolygon: any = {
            type: 'simple',
            symbol: this.polygonSymbol,
          };
          for (const feature of layer.featureSet.features) {
            feature.geometry = new Polygon({
              rings: feature.geometry.rings,
              spatialReference: feature.geometry.spatialReference,
            });
          }
          featureLayer.renderer = rendererPolygon;
          break;
        case 'esriGeometryPolyline':
          const polylineRenderer: any = {
            type: 'simple',
            symbol: this.polylineSymbol,
          };
          for (const feature of layer.featureSet.features) {
            feature.geometry = new Polyline({
              paths: feature.geometry.paths,
              spatialReference: feature.geometry.spatialReference,
            });
          }
          featureLayer.renderer = polylineRenderer;
          break;
        default:
          this.sharedMapService.showWarningAlert('No es valido el shapefile');
      }

      featureLayer.when(() => {
        var extentCenter = featureLayer.fullExtent.center;
        if (extentCenter.x && extentCenter.y) {
          if (!fullExtent) {
            fullExtent = featureLayer.fullExtent;
          } else {
            fullExtent = fullExtent.union(featureLayer.fullExtent);
          }
        }

        index += 1;
        if (index === layersLength) {
          if (fullExtent) {
            this.sharedMapService?.view?.goTo({
              target: fullExtent,
            });
          }
        }
      });
      featureLayer.source = layer.featureSet.features;
      layers.push(featureLayer);
    }

    setTimeout(() => {
      layers.forEach((layer: any) => {
        layer.popupTemplate = this.createPopupTemplateFromFields(layer);
      });
    }, 1000);

    if (layers.length > 0) {
      this.sharedMapService?.view?.map.addMany(layers);
      if (fullExtent) {
        this.sharedMapService?.view?.goTo({
          target: fullExtent,
        });
      }
    }
    this.sharedMapService.showSuccessAlert('Geometrias añadidas.');
    this.loading = false;
    this.buttonText = 'Cargar';
  }

  generateFeatures(file: any, filetype: any, job: any): void {
    const url = 'https://www.arcgis.com/sharing/rest/content/features/generate';
    let params: any = {
      name: file.name,
      targetSR: this.sharedMapService?.view?.spatialReference,
      maxRecordCount: 1000,
      enforceInputFileSizeLimit: true,
      enforceOutputJsonSizeLimit: true,
      generalize: true,
      //maxAllowableOffset: this.sharedMapService?.view?.resolution,
      maxAllowableOffset: 10,
      reducePrecision: true,
      numberOfDigitsAfterDecimal: 0,
    };

    if (job) {
      const publishParameters = job.publishParameters || {};
      params = { ...params, ...publishParameters };
      params['locationType'] = 'coordinates';
      params['coordinateFieldType'] = 'LatitudeAndLongitude';
      params['latitudeFieldName'] = 'latitud';
      params['longitudeFieldName'] = 'longitud';
    }

    const formdata = new FormData();
    formdata.append('filetype', filetype);
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
            this.sharedMapService.showErrorAlert(response.error);
            this.loading = false;
            this.buttonText = 'Cargar';
            return;
          }
        }
        const fileNameWithoutExtension: string = file.name.replace(/\.[^/.]+$/, "");
        this.addFeatureCollectionToMap(response.featureCollection);
      })
      .catch((error) => {
        this.loading = false;
        this.buttonText = 'Cargar';
      });
  }

  addLayerToMap(featureCollection: any): void {
    const layers: any = [];
    let fullExtent: any = null;
    let index = 0;
    const layersLength = featureCollection.layers.length;

    for (const layer of featureCollection.layers) {
      const featureLayer = new FeatureLayer({
        id: 'madsi-featureLayerShapefile',
        objectIdField: 'ObjectID',
        fields: layer.layerDefinition.fields.map((field: any) => ({
          name: field.name,
          alias: field.alias,
          type:
            field.name == 'FID' || field.name == 'OBJECTID' ? 'oid' : 'string',
          nullable: field.name != 'FID' || field.name == 'OBJECTID',
        })),
        //   title: featureCollection.layers[0].layerDefinition.name,
        title: layer.layerDefinition.name,
      });

      switch (layer.featureSet.geometryType) {
        case 'esriGeometryPoint':
          const rendererPoint: any = {
            type: 'simple',
            symbol: this.pointSymbol,
          };
          for (const feature of layer.featureSet.features) {
            feature.geometry = new Point({
              x: feature.geometry.x,
              y: feature.geometry.y,
              spatialReference: feature.geometry.spatialReference,
            });
          }
          featureLayer.renderer = rendererPoint;
          break;
        case 'esriGeometryPolygon':
          const rendererPolygon: any = {
            type: 'simple',
            symbol: this.polygonSymbol,
          };
          for (const feature of layer.featureSet.features) {
            feature.geometry = new Polygon({
              rings: feature.geometry.rings,
              spatialReference: feature.geometry.spatialReference,
            });
          }
          featureLayer.renderer = rendererPolygon;
          break;
        case 'esriGeometryPolyline':
          const polylineRenderer: any = {
            type: 'simple',
            symbol: this.polylineSymbol,
          };
          for (const feature of layer.featureSet.features) {
            feature.geometry = new Polyline({
              paths: feature.geometry.paths,
              spatialReference: feature.geometry.spatialReference,
            });
          }
          featureLayer.renderer = polylineRenderer;
          break;
        default:
          this.sharedMapService.showWarningAlert('No es valido el shapefile');
      }

      featureLayer.when(() => {
        var extentCenter = featureLayer.fullExtent.center;
        if (extentCenter.x && extentCenter.y) {
          if (!fullExtent) {
            fullExtent = featureLayer.fullExtent;
          } else {
            fullExtent = fullExtent.union(featureLayer.fullExtent);
          }
        }

        index += 1;
        if (index === layersLength) {
          if (fullExtent) {
            this.sharedMapService?.view?.goTo({
              target: fullExtent,
            });
          }
        }
      });
      featureLayer.source = layer.featureSet.features;
      layers.push(featureLayer);
    }

    setTimeout(() => {
      layers.forEach((layer: any) => {
        layer.popupTemplate = this.createPopupTemplateFromFields(layer);
      });
    }, 1000);

    if (layers.length > 0) {
      this.sharedMapService?.view?.map.addMany(layers);
      if (fullExtent) {
        this.sharedMapService?.view?.goTo({
          target: fullExtent,
        });
      }
    }
    this.sharedMapService.showSuccessAlert('Geometrias añadidas.');
    this.loading = false;
    this.buttonText = 'Cargar';
  }

  addCsvFile(file: any): void {
    const url = 'https://www.arcgis.com/sharing/rest/content/features/analyze';
    const analyzeParams = {
      enableGlobalGeocoding: true,
      sourceLocale: 'es-es',
      coordinateFieldType: 'LatitudeAndLongitude',
      latitudeFieldName: 'latitud',
      longitudeFieldName: 'longitud',
    };

    const formdata = new FormData();
    formdata.append('filetype', 'csv');
    formdata.append('analyzeParameters', JSON.stringify(analyzeParams));
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
            this.sharedMapService.showErrorAlert(response.error);
            this.loading = false;
            this.buttonText = 'Cargar';
            return;
          } else {
            if (
              response &&
              response.publishParameters &&
              response.publishParameters.locationType &&
              response.publishParameters.locationType === 'unknown'
            ) {
              this.sharedMapService.showErrorAlert(response.error);
              this.loading = false;
              this.buttonText = 'Cargar';
            } else {
              this.generateFeatures(file, 'csv', response);
            }
          }
        }
      })
      .catch((error) => {
        this.loading = false;
        this.buttonText = 'Cargar';
      });
  }

  addKmlFile(file: any): void {
    if (this.geoJSONLayer) {
      this.sharedMapService?.view?.map.layers.remove(this.geoJSONLayer);
    }

    let fileReader = new FileReader();
    fileReader.onload = async (e: any) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(e.target.result, 'text/xml');
      const geojson = kml(xmlDoc);
      const blob = new Blob([JSON.stringify(geojson)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      this.geoJSONLayer = new GeoJSONLayer({ url });
      this.sharedMapService?.view?.map.add(this.geoJSONLayer);
      this.geoJSONLayer.when(() => {
        this.sharedMapService?.view?.goTo(this.geoJSONLayer.fullExtent);
      });
      this.loading = false;
      this.buttonText = 'Cargar';
    };
    fileReader.readAsText(file);
  }

  onAddServiceClick(): void {
    if (this.serviceType && this.urlLayer) {
      const id = this.generateLayerId();
      switch (this.serviceType) {
        case '1':
          this.addESRIServices(id);
          break;
        case '2':
          this.addWMSServices(id);
          break;
        case '3':
          this.addWFSServices(id);
          break;
        case '4':
          this.addKMLServices(id);
          break;
        case '5':
          this.addCSVServices(id);
          break;
      }
    } else {
      this.sharedMapService.showWarningAlert(
        'Todos los datos son obligatorios!'
      );
    }
  }

  addESRIServices(id: any): void {
    if (
      this.urlLayer.toLowerCase().indexOf('/featureserver') >= 0 ||
      this.urlLayer.toLowerCase().indexOf('/mapserver') > 0
    ) {
      esriRequest(this.urlLayer + '?f=json', {
        responseType: 'json',
      }).then((response: any) => {
        const info = response.data;
        if (
          info &&
          typeof info.type === 'string' &&
          (info.type === 'Feature Layer' || info.type === 'Table')
        ) {
          this.addFeatureLayer(this.urlLayer, id);
        } else {
          if (this.urlLayer.toLowerCase().indexOf('/featurelayer') >= 0) {
            for (const layer of info.layers) {
              this.addFeatureLayer(this.urlLayer + '/' + layer.id, id);
            }
            for (const layer of info.tables) {
              this.addFeatureLayer(this.urlLayer + '/' + layer.id, id);
            }
          } else if (this.urlLayer.toLowerCase().indexOf('/mapserver') > 0) {
            if (info.tileInfo) {
              let tileLayer = new TileLayer({
                id: id,
                url: this.urlLayer,
              });
              this.sharedMapService?.view?.map.add(tileLayer);
            } else {
              let mapImageLayer = new MapImageLayer({
                id: id,
                url: this.urlLayer,
                sublayers: [{}, {}, {}],
                imageFormat: 'png32',
              });
              this.sharedMapService?.view?.map.add(mapImageLayer);
            }
          }
        }
      });
    } else if (this.urlLayer.toLowerCase().indexOf('/imageserver') >= 0) {
      let imageryLayer = new ImageryLayer({
        id: id,
        url: this.urlLayer,
      });
      this.sharedMapService?.view?.map.add(imageryLayer);
    } else if (this.urlLayer.toLowerCase().indexOf('/vectortileserver') >= 0) {
      let vectorTileLayer = new VectorTileLayer({
        id: id,
        url: this.urlLayer,
      });
      this.sharedMapService?.view?.map.add(vectorTileLayer);
    } else {
      this.sharedMapService.showWarningAlert('El servicio no está soportado');
    }
  }

  addWMSServices(id: any): void {
    let wmsLayer = new WMSLayer({
      id: id,
      url: this.urlLayer,
    });
    this.sharedMapService?.view?.map.add(wmsLayer);
  }

  addWFSServices(id: any): void {
    let wfsLayer = new WFSLayer({
      id: id,
      url: this.urlLayer,
    });
    this.sharedMapService?.view?.map.add(wfsLayer);
  }

  addKMLServices(id: any): void {
    let kmlLayer = new KMLLayer({
      id: id,
      url: this.urlLayer,
    });
    this.sharedMapService?.view?.map.add(kmlLayer);
  }

  addCSVServices(id: any): void {
    let csvLayer = new CSVLayer({
      id: id,
      url: this.urlLayer,
    });
    this.sharedMapService?.view?.map.add(csvLayer);
  }

  addFeatureLayer(layerUrl: any, id: any): void {
    let featureLayer = new FeatureLayer({
      id: id,
      url: layerUrl,
      outFields: ['*'],
    });
    this.sharedMapService?.view?.map.add(featureLayer);
  }

  generateLayerId(): any {
    return this.generateLayerIds(1)[0];
  }

  generateLayerIds(count: any): any {
    var ids: any = [];
    for (let i = 0; i < count; i++) {
      ids.push(this.generateRandomId());
    }
    return ids;
  }

  generateRandomId(): any {
    let t = Date.now();
    if (typeof Date.now === 'function') {
      t = Date.now();
    } else {
      t = new Date().getTime();
    }
    var r = ('' + Math.random()).replace('0.', 'r');
    return 'madsi-' + (t + '' + r).replace(/-/g, '');
  }

  removeShapefileLayer(): void {
    const foundLayer = this.sharedMapService?.view?.map.allLayers.find(
      (layer: any) => {
        return layer.id === 'madsi-featureLayerShapefile';
      }
    );
    if (foundLayer) {
      this.sharedMapService?.view?.map.layers.remove(foundLayer);
    }
  }

  ngOnDestroy() {
    if (this.geoJSONLayer) {
      this.sharedMapService?.view?.map.layers.remove(this.geoJSONLayer);
    }
    this.removeShapefileLayer();
  }

  onChangeServiceType(event: Event) {
    this.serviceType = (event.target as HTMLInputElement).value;
  }

  onChangeUrlFormControl(event: Event) {
    this.urlLayer = (event.target as HTMLInputElement).value;
  }
}
