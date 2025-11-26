import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import Polygon from '@arcgis/core/geometry/Polygon';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import Query from '@arcgis/core/rest/support/Query';
import { SharedMapService } from '../../services/shared-map.service';
import FeatureTable from '@arcgis/core/widgets/FeatureTable';
import * as geoprocessor from '@arcgis/core/rest/geoprocessor';
import * as geoprocessor2 from '@arcgis/core/rest/geoprocessor';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'conservar-paga-component',
  templateUrl: './conservar.paga.component.html',
  styleUrls: ['./conservar.paga.component.scss'],
})
export class ConservarPagaComponent implements OnInit, OnDestroy {
  loading: boolean = false;
  openConfirmation: boolean = false;
  openProgress: boolean = false;
  urlLayer: string = '';
  geoJSONLayer: any;
  disabledLoadButton: boolean = false;
  disabledSaveButton: boolean = true;
  idCargue: string = '';
  userRol: string = '';
  areaLayer: any;
  graphics: any[] = [];
  listaPredios: any[] = [];
  valueNoDomainFields: string[] = [];
  fileUpload: File | undefined;
  requiredFields = [
    'ID_predio',
    'ID_acuerdo',
    'tipo_tenen',
    'doc_propi',
    'fecha_dato',
    'anio_unida',
    'nom_pred',
    'longitud',
    'latitud',
    'perimetro',
    'area_ha',
    'cod_dpto',
    'nom_dpto',
    'cod_mpo',
    'nom_mpo',
    'ndfyb',
    'cod_ndfyb',
    'validacion',
    'sina',
    'fecha_acu',
    'superf_bos',
    'shp_fuente',
  ];

  fieldMap: Record<string, string> = {
    ID_PREDIO: "id_predio",
    ID_ACUERDO: "id_acuerdo",
    ID_COM_GES: "id_com_ges",
    TIPO_TENEN: "tipo_tenen",
    DOC_PROPI: "doc_propi",
    MATRI_INM: "matr_inmob",
    NO_DOC_TEN: "no_doc_ten",
    FECHA_DATO: "fecha_dato",
    ANIO_UNIDA: "anio_unida",
    NOM_PRED: "nom_pred",
    VEREDA: "vereda",
    LONGITUD: "longitud",
    LATITUD: "latitud",
    PERIMETRO: "perimetro",
    AREA_Ha: "area_ha",
    SHP_FUENTE: "shp_fuente",
    COD_DPTO: "cod_dpto",
    NOM_DPTO: "nom_dpto",
    COD_MPO: "cod_mpo",
    NOM_MPO: "nom_mpo",
    NDFyB: "ndfyb",
    COD_NDFyB: "cod_ndfyb",
    VALIDACION: "validacion",
    SINA: "sina",
    FECHA_ACU: "fecha_acu",
    INI_ACT_RE: "ini_act_re",
    TIPO_ACU: "tipo_acu",
    OBSV_DINA: "obs_dinamizador",
    OBSV_IDEAM: "obs_ideam",
    SUPERF_BOS: "s_bos_acu",
    TIPO_RESTA: "tipo_resta",
    META_RESTA: "s_bos_smbc",
    OBSV_RESTA: "obs",
    AREA_RESTA: "ar_ha_acu",
    DEF_01_25: "defo_2025_01",
    DEF_02_25: "defo_2025_02",
    DEF_03_25: "defo_2025_03",
    DEF_04_25: "defo_2025_04",
    DEF_05_25: "defo_2025_05",
    DEF_06_25: "defo_2025_06",
    DEF_07_25: "defo_2025_07",
    DEF_08_25: "defo_2025_08",
    DEF_09_25: "defo_2025_09",
    DEF_10_25: "defo_2025_10",
    DEF_11_25: "defo_2025_11",
    DEF_12_25: "defo_2025_12",
    DEF_ACUMUL: "defo_acumul",
    PORC_CAMB: "por_defo_calcu", // ⚠️ no existe directo, ojo
    Shape_Length: "shape_length",
    Shape_Area: "shape_area"
  };


  shapeFileFieldsFromLayerField: { [name: string]: string } = {

    id_predio: 'ID_predio',
    id_acuerdo: 'ID_acuerdo',


    doc_propi: 'doc_propie',
    cod_dpto: 'codigo_dep',
    nom_dpto: 'nombre_dep',
    cod_mpo: 'codigo_mun',
    nom_mpo: 'nombre_mun',
    cod_ndfyb: 'nucleo_des',
    ndfyb: 'nucleo_d_1',
    sina: 'entidad_si',
    validacion: 'validacion',

    tipo_tenen: 'tipo_tenen',
    fecha_dato: 'fecha_dato',
    anio_unida: 'anio_unida',
    nom_pred: 'nombre_pre',
    longitud: 'longitud',
    latitud: 'latitud',
    perimetro: 'perimetro_',
    area_ha: 'area_ha_pr',
    area_resta: 'area_ha_ac',
    shp_fuente: 'shape_fuen',
    superf_bos: 'superficie',


    fecha_acu: 'fecha_acu',
    obsv_dina: 'observacion_dinamizador',
    obsv_ideam: 'observacion_IDEAM',

  };

  gpUrl: string =
    `${environment.utilsUrl}/uploadfiles/GPServer`;

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
  featureLayer: any;
  featureLayerUrl: string = '';
  urlEndPoint: string = '';

  idPredio = '';


  token = '';

  constructor(
    private sharedMapService: SharedMapService,
    private router: Router,
    private elementRef: ElementRef
  ) {
    this.sharedMapService.loadMapImageLayerComplete$.subscribe((param: any) => {
      if (param === 'TRUE') {
        this.loadFeatures();
      }
    });
  }

  ngOnInit() { }

  loadFeatures(): void {
    this.sharedMapService.attributes$.subscribe((attributes) => {
      if (!attributes['id-cargue']) {
        this.disabledLoadButton = true;
        this.sharedMapService.showWarningAlert(
          'No existe un Id de cargue asignado'
        );
      } else {
        this.token = attributes['token'];
        this.idCargue = attributes['id-cargue'];
        this.userRol = attributes['rol'];
        this.urlEndPoint = this.sharedMapService.config.urlEndPoint;

        this.sharedMapService?.view?.map.allLayers.forEach((layer: any) => {
          if (layer.id.includes('AREAS_PRIORIZADAS')) {
            this.featureLayer = layer;
            this.featureLayerUrl = layer.url + `/${layer.layerId}`;
            console.log(this.featureLayerUrl, this.featureLayer);

            //fetch('/assets/data.json')
            fetch(`${this.urlEndPoint}/predios/?idCargue=${this.idCargue}`, {
              method: 'GET',
            })
              .then((response) => {
                return response.json();
              })
              .then((result) => {
                if (result) {
                  this.listaPredios = result.predios;
                  let idsPredios = this.listaPredios
                    .map((predio) => `'${predio.idPredio}'`)
                    .join(',');

                  //console.log('Tactu:' + this.idCargue + '|' + idsPredios);

                  const fillSymbol = new SimpleFillSymbol({
                    color: 'rgba(138, 43, 226, 0.8)',
                    outline: {
                      color: 'white',
                      width: 1,
                    },
                  });

                  const queryParams = new Query({
                    outFields: ['*'],
                    returnGeometry: true,
                    where: `id_cargue = '${this.idCargue}'`,
                    outSpatialReference:
                      this.sharedMapService.view.spatialReference,
                  });
                  (layer as FeatureLayer).visible = false;
                  layer
                    .queryFeatures(queryParams)
                    .then((results: any) => {
                      console.log(results);
                      layer.definitionExpression = queryParams.where;
                      if (results.features.length > 0) {
                        results.features.forEach((feature: any) => {
                          const graphic = new Graphic({
                            geometry: feature.geometry,
                            symbol: fillSymbol,
                          });
                          this.sharedMapService.graphicsLayer.add(graphic);
                        });
                        this.sharedMapService.view.goTo(
                          this.sharedMapService?.graphicsLayer?.graphics
                        );

                        this.sharedMapService.showSuccessAlert(
                          `Se encontraron ${results.features.length} geometrías en la capa`
                        );
                      }
                    })
                    .catch((error: any) => {
                      console.error(error);
                      this.loading = false;
                    });
                }
              })
              .catch((error) => {
                console.error(error);
              });

            this.areaLayer = new FeatureLayer({
              id: 'madsi-featureLayerShapefile',
              objectIdField: 'ObjectID',
            });
          }
        });
      }
    });
  }

  zoomToLayer(layer: any): void {
    return layer.queryExtent().then((response: any) => {
      if (response.count > 0) {
        this.sharedMapService.showSuccessAlert(
          `Se encontraron ${response.count} geometrías con código de predio ${this.idCargue} en la capa`
        );
      }

      this.sharedMapService?.view?.goTo(response.extent).catch((error) => {
        console.error(error);
      });
    });
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: any) {
    this.loading = true;
    const input = event.target;
    const file: File | undefined = input.files[0];
    this.fileUpload = file;
    if (file) {

      const maxSizeMB = 10;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (file.size > maxSizeBytes) {
        this.sharedMapService.showErrorAlert('El archivo supera los 10MB');
        this.loading = false;
        return;
      }

      const nombreArchivo = file.name;

      const regex = /^([A-Z]{2})-(\d{8})\.(gdb\.)?zip$/;

      const match = nombreArchivo.match(regex);

      if (!match) {
        this.sharedMapService.showErrorAlert(
          'El archivo debe tener el formato: XX-AAAAMMDD.zip'
        );

        this.loading = false;
        return;
      }

      const fechaStr = match[2];
      const year = parseInt(fechaStr.substring(0, 4));
      const mes = parseInt(fechaStr.substring(4, 6));
      const dia = parseInt(fechaStr.substring(6, 8));

      const fecha = new Date(year, mes - 1, dia);
      const fechaValida =
        fecha.getFullYear() === year &&
        fecha.getMonth() === mes - 1 &&
        fecha.getDate() === dia;

      if (!fechaValida) {
        this.sharedMapService.showErrorAlert(
          'La fecha en el nombre del archivo no es válida.'
        );
        this.loading = false;
        return;
      }

      const extension = file.name.split('.')?.pop()?.toLowerCase();
      const isGDB = file.name.toLowerCase().includes('gdb');
      if (extension == 'zip') {
        if (isGDB) {
          this.loading = true;
          this.addFile(file);
        } else {
          this.loading = true;
          //this.generateFeatures(file, 'shapefile', null);
          this.generateFeatureCollection(file);
        }
      }
    }

    input.value = null;
  }

  generateFeatureCollection(file: any) {
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
      .then(async (response) => {
        if (response) {
          if (response.error) {
            this.sharedMapService.showErrorAlert(response.error.message);
            this.loading = false;
            return;
          }

          const [missingFields, nullFields] = this.validateRequiredFields(
            response.featureCollection.layers[0].featureSet.features[0]
              .attributes,
            this.requiredFields
          );

          if (missingFields.length > 0) {
            this.sharedMapService.showErrorAlert(
              `Existen campos faltantes dentro del SHAPEFILE a cargar:<br> ${missingFields.join(
                ', '
              )}.
              ${nullFields.length > 0
                ? `<br><br>
              Existen campos sin diligenciar dentro del SHAPEFILE a cargar: <br> ${nullFields.join(
                  ', '
                )}.`
                : ''
              }
              `
            );
            this.loading = false;
            return;
          }
        }
        this.addShapefileToMap(response.featureCollection);
      })
      .catch((error) => {
        this.loading = false;
      });
  }

  addFile(file: File): void {
    this.uploadFile(file)
      .then((itemID: string) => {
        const fileNameWithoutExtension: string = file.name.replace(
          /\.[^/.]+$/,
          ''
        );
        this.addGDBShapefileToMap(itemID, fileNameWithoutExtension);
      })
      .catch((error) => {
        this.loading = false;
        console.error(
          'Error al subir el archivo o al obtener el itemID:',
          error
        );
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
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          return result.item.itemID;
        } else {
          throw new Error('Error al cargar el archivo');
        }
      });
  }

  addGDBShapefileToMap(itemID: string, fileName: string): void {
    const url = `${this.gpUrl}/Upload%20Files`;

    const params = {
      zip_file: `{'itemID':'${itemID}'}`,
    };

    geoprocessor
      .submitJob(url, params)
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
            jobInfoCompleted
              .fetchResultData('results_feature')
              .then((data: any) => {


                console.log(data);

                console.log('features', data.value.features);
                const features = data.value.features;

                const idsPredio = features.map((feature: any) => feature.attributes.id_predio);
                const uniqueIds = new Set(idsPredio);
                const totalFeatures = features.length;
                const totalUniqueIds = uniqueIds.size;

                if (totalFeatures != totalUniqueIds) {
                  this.sharedMapService.showErrorAlert("Existen Ids de predios repetidos en la GDB")
                }


                for (const feature of features) {
                  console.log('attributes', feature.attributes);
                  const [missingFields, nullFields] = this.validateRequiredFields(
                    //data.value.features[0].attributes,
                    feature.attributes,
                    this.requiredFields
                  );
                  console.log([missingFields, nullFields]);

                  if (missingFields.length > 0 || nullFields.length > 0) {
                    this.sharedMapService.showErrorAlert(
                      `Existen campos faltantes dentro del archivo GDB a cargar:<br> ${missingFields.join(
                        ', '
                      )} <br>
                   Tener en cuenta que el nombre de los atributos debe estar en minúsculas.
                    ${nullFields.length > 0
                        ? `<br><br>
                    Existen campos sin diligenciar dentro del archivo GDB a cargar: <br> ${nullFields.join(
                          ', '
                        )}.`
                        : ''
                      }
                    `
                    );
                    this.loading = false;
                    return;
                  }

                }



                const featureLayer = new FeatureLayer({
                  title: fileName,
                  fields: data.value.fields,
                  geometryType: data.value.geometryType,
                  source: data.value.features, // Agregar los features obtenidos
                });

                this.sharedMapService.view.map.add(featureLayer);
                featureLayer.when(() => {
                  this.sharedMapService?.view?.goTo(featureLayer.fullExtent);
                });
                this.addFilesToLayer(data.value.features);
                this.sharedMapService.showSuccessAlert('Geometrías añadidas.');
                this.loading = false;
              })
              .catch((error) => {
                console.error('Error al obtener datos:', error);
                this.sharedMapService.showErrorAlert(`Error al obtener datos: <br> ${error.message}`)
                this.loading = false;
              });
          })
          .catch((error) => {
            console.log('Error al completar el trabajo:', error);
            console.log(
              'Messages',
              error.messages.map((m: any) => [m.description, m.type])
            );
            this.loading = false;
          });
      })
      .catch((error) => {
        console.log(error);
        this.loading = false;
      });

    const progTest = (value: any) => {
      console.log(value.jobStatus);

      if (value.jobStatus == 'job-executing') {
        this.loading = true;
      }
    };
  }

  addFilesToLayer(features: Array<any>) {
    for (const feature of features) {


      const attributes: Record<string, any> = { id_cargue: this.idCargue };

      for (const [srcField, destField] of Object.entries(this.fieldMap)) {
        const value = this.getValueField(feature.attributes[srcField]);
        attributes[destField] = isNaN(Number(value)) ? value : Number(value);
      }


      console.log('ATRIBUTES', attributes);

      const graphic = new Graphic({
        geometry: feature.geometry,
        attributes: attributes
      });
      this.graphics.push(graphic);
    }
    this.disabledSaveButton = false;

    this.sharedMapService.showSuccessAlert(
      `Se han cargado ${features.length} geometrías, dé clic en Guardar para continuar con el proceso`
    );
  }

  validateRequiredFields(data: any, requiredFields: string[]): [string[], string[]] {
    const missingFields: string[] = [];
    const nullFields: string[] = [];

    // Normalizamos todas las keys del objeto a minúscula
    const normalizedData: Record<string, any> = {};
    for (let key in data) {
      normalizedData[key.toLowerCase()] = data[key];
    }

    for (let field of requiredFields) {
      const lowerField = field.toLowerCase(); // comparamos en minúscula

      if (!normalizedData.hasOwnProperty(lowerField)) {
        missingFields.push(field); // guardamos con el nombre original (no en minúscula)
      } else if (
        normalizedData[lowerField] === null ||
        normalizedData[lowerField] === undefined ||
        normalizedData[lowerField] === ''
      ) {
        nullFields.push(field);
      }
    }

    return [missingFields, nullFields];
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
      maxAllowableOffset: this.sharedMapService?.view?.resolution,
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
            return;
          }
        }
        this.addShapefileToMap(response.featureCollection);
      })
      .catch((error) => {
        this.loading = false;
      });
  }



  addShapefileToMap(featureCollection: any): void {
    this.removeShapefileLayer();
    this.graphics = [];

    const layers: any = [];
    let fullExtent: any = null;
    const layersLength = featureCollection.layers.length;
    let index = 0;
    const idLayer = 'madsi-featureLayerShapefile';
    const filterAreaLayer =
      this.sharedMapService.view?.map?.findLayerById(idLayer);

    for (const layer of featureCollection.layers) {
      this.areaLayer = new FeatureLayer({
        id: idLayer,
        objectIdField: 'ObjectID',
        title: featureCollection.layers[0].layerDefinition.name,
      });

      switch (layer.featureSet.geometryType) {
        case 'esriGeometryPoint':
          this.sharedMapService.showWarningAlert(
            'La geometría tipo punto no se encuentra permitida, cargar geometría tipo polígono'
          );
          break;
        case 'esriGeometryPolygon':
          console.log(
            layer.featureSet.features.length,
            'vs',
            this.listaPredios.length
          );

          if (layer.featureSet.features.length > this.listaPredios.length) {
            this.sharedMapService.showWarningAlert(
              'El número de geometrías a cargar es mayor al que debe cargar'
            );
          } else {
            if (layer.featureSet.features.length < this.listaPredios.length) {
              this.sharedMapService.showWarningAlert(
                'El número de geometrías a cargar es menor al que debe cargar'
              );
            } else {
              let features;
              let predioRepetido = false;
              let predioNoEncontrado = false;

              this.listaPredios.forEach((item: any) => {
                features = layer.featureSet.features.filter(
                  (s: { attributes: { ID_predio: string } }) =>
                    s.attributes.ID_predio == item.idPredio
                );

                if (features.length == 0) {
                  predioNoEncontrado = true;
                } else if (features.length > 1) {
                  predioRepetido = true;
                }
              });

              if (predioNoEncontrado) {
                this.sharedMapService.showWarningAlert(
                  'No se puede cargar, existen predios inexistentes dentro de las geometrías a cargar'
                );
              } else if (predioRepetido) {
                this.sharedMapService.showWarningAlert(
                  'No se puede cargar, existen predios repetidos dentro de las geometrías a cargar'
                );
              } else {
                const rendererPolygon: any = {
                  type: 'simple',
                  symbol: this.polygonSymbol,
                };
                let id_predio = '000';

                for (const feature of layer.featureSet.features) {
                  feature.geometry = new Polygon({
                    rings: feature.geometry.rings,
                    spatialReference: feature.geometry.spatialReference,
                  });

                  if (feature.attributes.ID_predio) {
                    id_predio = feature.attributes.ID_predio;
                  }

                  const attributes: Record<string, any> = { id_cargue: this.idCargue };

                  for (const [srcField, destField] of Object.entries(this.fieldMap)) {
                    const value = this.getValueField(feature.attributes[srcField]);
                    attributes[destField] = isNaN(Number(value)) ? value : Number(value);
                  }


                  console.log('ATRIBUTES', attributes);

                  const graphic = new Graphic({
                    geometry: feature.geometry,
                    attributes: attributes
                  });
                  this.graphics.push(graphic);
                }
                this.areaLayer.renderer = rendererPolygon;
                this.disabledSaveButton = false;

                this.sharedMapService.showSuccessAlert(
                  `Se han cargado ${this.listaPredios.length} geometrías, dé clic en Guardar para continuar con el proceso`
                );
              }

              this.areaLayer.source = layer.featureSet.features;
              layers.push(this.areaLayer);

              if (layers.length > 0) {
                if (!filterAreaLayer) {
                  this.sharedMapService?.view?.map.addMany(layers);
                }

                if (fullExtent) {
                  this.sharedMapService?.view?.goTo({
                    target: fullExtent,
                  });
                }
              }
            }
          }

          break;
        case 'esriGeometryPolyline':
          this.sharedMapService.showWarningAlert(
            'La geometría tipo línea no se encuentra permitida, cargar geometría tipo polígono'
          );
          break;
        default:
          this.sharedMapService.showWarningAlert('No es valido el archivo.');
      }
    }

    this.areaLayer.when(() => {
      var extentCenter = this.areaLayer.fullExtent.center;
      if (extentCenter.x && extentCenter.y) {
        if (!fullExtent) {
          fullExtent = this.areaLayer.fullExtent;
        } else {
          fullExtent = fullExtent.union(this.areaLayer.fullExtent);
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

    this.loading = false;
  }

  getValueField(field: any): any {
    let value = field ?? '';

    return value;
  }

  onSaveClick(): void {
    console.log(this.graphics);

    const existeIdPredio = this.graphics.filter(
      (s) => s.attributes.id_predio == '000'
    );
    if (existeIdPredio.length > 0) {
      this.openConfirmation = false;
      this.sharedMapService.showErrorAlert(
        'No se pueden guardar las geometrías ya que no cuentan con el atributo ID_predio'
      );
    } else {
      this.openConfirmation = false;
      this.valueNoDomainFields = [];

      const arrayNoDomainFields: string[] = [];
      console.log('this.featureLayer', this.graphics, this.featureLayer);

      this.featureLayer.fields.forEach((field: any) => {
        if (!field.domain) {
          return;
        }

        let domain = field.domain;
        if (domain.type === 'coded-value') {
          this.graphics.forEach((g: any) => {

            const valueField = g.attributes[field.name];

            const arrayDomainGraphic = domain.codedValues.filter(
              (d: any) => d.code == valueField
            );

            if (arrayDomainGraphic.length == 0) {
              console.log('verificacion', field.name, valueField, arrayDomainGraphic, domain.codedValues.map((d: any) => [d.code, d.name]));
              arrayNoDomainFields.push(field.name);
            }

          });
        }
      });

      const addEdits = {
        addFeatures: this.graphics,
      };

      this.valueNoDomainFields = [...new Set(arrayNoDomainFields)];
      this.valueNoDomainFields = this.valueNoDomainFields.map(
        (value: string) => this.shapeFileFieldsFromLayerField[`${value}`]
      );
      if (this.valueNoDomainFields.length > 0) {
        this.sharedMapService.showErrorAlert(
          `Existen campos con valores de dominios no permitidos dentro del archivo a cargar:<br> ${this.valueNoDomainFields.join(
            ', '
          )}.
          `
        );
        this.loading = false;
        return;
      }
      this.openProgress = true;
      this.enviarArchivoAServer(this.graphics).then(() => {
        // this.applyEditsToLayer(addEdits);
        console.log('enviarArchivoAServer');
        this.openConfirmation = false;
        this.openProgress = false;

      });

    }
  }

  async enviarArchivoAServer(data: any) {
    const formData = new FormData();
    formData.append('file', this.fileUpload!);
    formData.append('cantidad_predios', `${[...data].length}`)

    const requestOptions = {
      method: 'POST',
      body: formData,
    };

    try {
      const url = environment.apiUrl;
      const response = await fetch(
        `${url}api/cargue_predios_s3/`,
        requestOptions
      );

      const result = await response.json();
      const id_carge = result.id_cargue;

      const message = `Archivo subido y procesado correctamente. Su ID de cargue es: ${id_carge}. Se le estará enviando a su correo la confirmación del cargue de los polígonos.`;

      this.sharedMapService.showSuccessAlert(message);
      await new Promise((resolve) => setTimeout(resolve, 6000));

      /**Despues de 6segs se ejecuta el geoproceso*/
      //? Descomentar la linea del geoproceso
      //this.ejecutarGeoproceso();


      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }


  async ejecutarGeoproceso(): Promise<any> {
    try {
      /**Parametros y URL del geoproceso */
      const url = 'URL_GEOPROCESO'
      const params = {
        param1: 'param'
      }

      /**Ejecucion del geoproces */
      geoprocessor2.submitJob(url, params).then(
        (jobInfo) => {

          /**Opciones para el log del geoproceso */
          const options = {
            statusCallback: (jobStatusInfo: any) => {
              progreso(jobStatusInfo);
            },
          };

          /**Esperar que termine el proceso */
          jobInfo
            .waitForJobCompletion(options)
            .then((jobInfoCompleted) => {

              jobInfoCompleted
                .fetchResultData('DATA_A_CONSULTAR').then((data) => {
                  /**Acciones con la data */
                  console.log(data);

                }).catch((err) => {
                  console.error('Error al obtener datos:', err)
                })

            });
        }
      ).catch((error) => {
        console.log('Error al completar el trabajo:', error);
        console.log(
          'Messages',
          error.messages.map((m: any) => [m.description, m.type])
        );
      });

    } catch (err) {
      console.error('Error ejecutando geoproceso', err);
      throw err;
    }
    const progreso = (jobStatusInfo: any) => {
      console.log('Progreso:', jobStatusInfo.jobStatus);
    }
  }


  applyEditsToLayer(edits: any): void {
    this.featureLayer
      .applyEdits(edits)
      .then((results: any) => {
        if (results.addFeatureResults.length) {
          let objectIds: any[] = [];
          results.addFeatureResults.forEach((item: any) => {
            objectIds.push(item.objectId);
          });

          this.featureLayer
            .queryFeatures({
              objectIds: objectIds,
            })
            .then((results: any) => {
              this.openConfirmation = false;
              this.openProgress = false;
              this.disabledSaveButton = true;
              this.sharedMapService.showSuccessAlert(
                `Se agregaron ${results.features.length} geometrías a la capa, proceso exitoso`
              );

              const headers = new Headers();
              headers.append('Content-Type', 'application/json');

              const raw = JSON.stringify({
                idCargue: `${this.idCargue}`,
              });

              fetch(`${this.urlEndPoint}/enviar-correo/`, {
                method: 'POST',
                headers: headers,
                body: raw,
              })
                .then((response) => {
                  return response.json();
                })
                .then((response) => {
                  if (response) {
                    if (response.error) {
                      this.sharedMapService.showErrorAlert(response.error);
                      this.loading = false;
                      return;
                    }
                  }
                })
                .catch((error) => {
                  console.log(error);
                  this.loading = false;
                });
            })
            .catch((error: any) => {
              this.openConfirmation = false;
              this.openProgress = false;
              this.sharedMapService.showErrorAlert(
                `Error al guardar las geometrías a la capa <br> ${error.message}`
              );
              console.error(error);
            });
        }
      })
      .catch((error: any) => {
        this.openConfirmation = false;
        this.openProgress = false;
        this.sharedMapService.showErrorAlert(
          `Error al guardar las geometrías a la capa <br> ${error.message}`
        );
        console.error(error);
      });
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

  onChangeKeyFormControl(event: Event) {
    this.idPredio = (event.target as HTMLInputElement).value;
  }

  async fetchPredio() {
    const fillSymbol = new SimpleFillSymbol({
      color: 'rgba(34,138,226, 0.8)',
      outline: {
        color: 'white',
        width: 1,
      },
    });
    this.sharedMapService.featureTable.highlightIds.removeAll();
    this.loading = true;
    const areasLayer: FeatureLayer = this.sharedMapService.view.map.allLayers
      .toArray()
      .filter((l) => l.title == 'Áreas Priorizadas')[0] as FeatureLayer;
    const popupTemplate = areasLayer.popupTemplate;
    areasLayer.definitionExpression = '1=1';

    try {
      const data = await areasLayer.queryFeatures({
        returnGeometry: true,
        where: `id_predio = '${this.idPredio}'`,

        outFields: ['*'],
      });

      console.log(data);
      const geometries = data.features.map((feature) => feature.geometry);

      if (data.features.length > 0) {
        this.createTable(areasLayer);
        this.sharedMapService.featureTable.highlightIds.addMany(
          data.features.map((f) => f.attributes.objectid)
        );

        data.features.forEach((feat: any) => {
          const graphic = new Graphic({
            geometry: feat.geometry,
            symbol: fillSymbol,
          });
          this.sharedMapService.graphicsLayer.add(graphic);

          feat.popupTemplate = popupTemplate;
        });

        //CY-18150-00072 | CY-18150-00070

        //@ts-ignore
        this.sharedMapService.view.openPopup({ features: data.features });
        this.sharedMapService.view.goTo(geometries).catch((error) => {
          this.sharedMapService.showWarningAlert(
            `Error al ir a la geometría: <br> ${error}`
          );
        });
      } else {
        this.sharedMapService.showWarningAlert(
          'No se encontraron features con el ID especificado.'
        );
      }
    } catch (error) {
      console.log(error);
    }
    this.loading = false;
  }

  async clearSearch() {
    this.loading = true;
    this.sharedMapService.featureTable.highlightIds.removeAll();
    const areasLayer: FeatureLayer = this.sharedMapService.view.map.allLayers
      .toArray()
      .filter((l) => l.title == 'Áreas Priorizadas')[0] as FeatureLayer;
    areasLayer.definitionExpression = `id_cargue = '${this.idCargue}'`;
    this.sharedMapService.toggleFeatureTable(false);
    this.loading = false;
  }

  async createTable(layer: any) {
    this.sharedMapService.featureTable.layer = layer;
    this.sharedMapService.toggleFeatureTable(true);
  }

  ngOnDestroy() {
    if (this.geoJSONLayer) {
      this.sharedMapService?.view?.map.layers.remove(this.geoJSONLayer);
    }
    this.removeShapefileLayer();
  }
}
