import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import IdentityManager from "@arcgis/core/identity/IdentityManager";
import Polygon from '@arcgis/core/geometry/Polygon';
import Extent from "@arcgis/core/geometry/Extent";
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import * as query from '@arcgis/core/rest/query';
import Query from '@arcgis/core/rest/support/Query';
import { SharedMapService } from '../../services/shared-map.service';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import * as toGeoJSON from "@tmcw/togeojson";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import { TokenService } from 'src/app/services/token.service';
import JSZip from 'jszip';
import tiposIniciativaDataJson from 'src/assets/traslape/tipos_iniciativa.json';
import tiposActividadDataJson from 'src/assets/traslape/tipos_actividad.json';

interface QueryOptions {
  filtro?: string | null;
  outFields?: string[];
  returnGeometry?: boolean;
}
@Component({
  selector: 'cmp-traslape-component',
  templateUrl: './cmp-traslape.component.html',
  styleUrls: ['./cmp-traslape.component.scss']
})
export class CmpTraslapeComponent {
  @Input() idSolicitud: string = '';
  @Input() idTipoActividad: string = '';
  @Input() fechaInicialActividad: string = '';
  @Input() fechaFinalActividad: string = '';
  @Input() resultadoTraslape?: (datos?: object | undefined) => object | undefined;
  @ViewChild('resultadoTraslapeEvent', { static: false }) resultadoTraslapeEvent!: ElementRef;
  
  loading: boolean = false;
  loadingTraslape: boolean = false;
  openRenareConfirmation: boolean = false;
  openTraslape: boolean = false;
  openProgress: boolean = false;
  urlLayer: string = '';
  geoJSONLayer: any;
  disabledLoadButton: boolean = false;
  disabledSaveButton: boolean = true;
  openAdvertenciaTraslape: boolean = false;
  disabledTraslapeButton: boolean = true;
  traslapeRunned: boolean = false;
  solicitud: any;
  areaLayer: any;
  graphics: any[] = [];
  valueNoDomainFields: string[] = [];
  requiredFields = [];
  resultado: object | undefined;
  messageResultadoTraslape: string = '';
  private layersToIntercept: any;
  traslapeRUNAP: boolean = false;
  traslapeANLA: boolean = false;
  traslapeProyectoREDMAS: boolean = false;
  traslapeProgramaREDMAS: boolean = false;
  traslapeConImplementadas = false;
  resultadoFinalTraslape: { resultado: string; fechaTraslape?: number } | undefined;

  gpUrl: string =
    'https://geo.minambiente.gov.co/server/rest/services/Utils/uploadfiles/GPServer';

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

  polygonSymbolTraslape: any = {
    type: "simple-fill", // Tipo de símbolo para polígonos
    color: [255, 165, 0, 0.5], // Naranja con opacidad 0.8
    style: "horizontal", // Patrón diagonal hacia atrás
    outline: {
      color: [255, 140, 0], // Borde naranja oscuro
      width: 3 // Ancho del borde
    }
  };

  polylineSymbol: any = { type: 'simple-line', size: 6, color: 'white' };
  featureLayer: any;
  featureLayerUrl: string = '';
  urlEndPoint: string = '';
  tokenKeycloak: string = '';

  constructor(
    private sharedMapService: SharedMapService,
    public tokenService: TokenService
  ) {

    localStorage.getItem('keycloak-token') ? this.tokenKeycloak = localStorage.getItem('keycloak-token')! : this.tokenKeycloak = '';
    // console.log("CmpTraslapeComponent initialized");
    // console.log("Token service ::: ", this.tokenService);
    // console.log("Token Keycloak ::: ", this.tokenKeycloak);

     if (this.tokenService.token) {
        const portalUrl = `${this.sharedMapService.getBaseServiceById(
          'URL_PORTAL'
        )}/sharing/rest`;
        const serverUrl = `${this.sharedMapService.getBaseServiceById(
          'URL_SERVER'
        )}/rest/services`;

        IdentityManager.registerToken({
          server: portalUrl,
          token: this.tokenService.token,
        });

        IdentityManager.registerToken({
          server: serverUrl,
          token: this.tokenService.token,
        });
      
      // Podrías necesitar registrar para la URL base exacta del GPService también si es accedido por la API de JS
      // y no solo por fetch manual.
      // IdentityManager.registerToken({
      //   server: this.gpUrl, // "https://geo.minambiente.gov.co/server/rest/services/Utils/uploadfiles/GPServer"
      //   token: this.tokenService.token
      // });

      console.log("Token de ArcGIS registrado con IdentityManager para geo.minambiente.gov.co");
    } else {
      console.warn("TokenService no proveyó un token. Los servicios seguros de ArcGIS podrían fallar o pedir credenciales.");
    }


    this.sharedMapService.view.when(() => {
      this.loadFeatures();
      this.setLayers();
    });
  }

  ngOnInit() { }

  loadFeatures(): void {
    this.sharedMapService.attributes$.subscribe(() => {

      // console.log("Id_solicitud :: ", this.idSolicitud);
      // console.log("IdTipoActividad :: ", this.idTipoActividad);
      // console.log("Fecha Inicial:: ", this.fechaInicialActividad);
      // console.log("Fecha Final :: ", this.fechaFinalActividad);
      if (!this.idSolicitud) {
        this.disabledLoadButton = true;
        this.sharedMapService.showWarningAlert(
          'No existe un Id de Solicitud registrada'
        );
        return;
      }

      if (!this.idTipoActividad) {
        this.disabledLoadButton = true;
        this.sharedMapService.showWarningAlert(
          'No existe un Tipo de Actividad válido.'
        );
        return;
      }

      if (!this.fechaInicialActividad) {
        this.disabledLoadButton = true;
        this.sharedMapService.showWarningAlert(
          'No existe una Fecha Inicial para la Actividad válida.'
        );
        return;
      }

      if (!this.fechaFinalActividad) {
        this.disabledLoadButton = true;
        this.sharedMapService.showWarningAlert(
          'No existe una Fecha Final para la Actividad válida.'
        );
        return;
      }

      this.urlEndPoint = this.sharedMapService.config.urlEndPoint;

      //Cargar datos de las iniciativa
      fetch(`${this.urlEndPoint}/api/gestion/solicitud/${this.idSolicitud}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.tokenKeycloak}`,
          'Content-Type': 'application/json'
        }
      }).then((response) => {
        return response.json();
      }).then(async (result) => {

        if (result) {
          this.solicitud = result;

          //Consultar existencia de solicitud en la fase de factibilidad
          let solicitudFeature = {};

          //Consulta
          const queryOptions: QueryOptions = {
            outFields: ['*'],
            filtro: `id_inic_sistema='${this.idSolicitud}'`,
            returnGeometry: true
          };

          //Capa de factibilidad
          const { url: capaFact } = this.getLayerUrl("INICIATIVAS", "INICIATIVAS_FACTIBILIDAD");
          const solicitudGeografico = await this.getSolicitudGeografico(capaFact, queryOptions);

          if (solicitudGeografico && solicitudGeografico.features) {
            console.log('Cantidad de características:', solicitudGeografico.features.length);
          }

        } else {
          this.sharedMapService.showErrorAlert(
            `La solicitud con ${this.idSolicitud} no se encuentra registrada`
          );
        }

      }).catch((error) => {
        console.error(error);
      });

      this.areaLayer = new FeatureLayer({
        id: 'madsi-featureLayerFile',
        objectIdField: 'ObjectID',
      });
    });
  }

  zoomToLayer(layer: any): void {
    return layer.queryExtent().then((response: any) => {
      if (response.count > 0) {
        this.sharedMapService.showSuccessAlert(
          `Se encontraron ${response.count} geometrías con código de solcitud ${this.idSolicitud} en la capa`
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

  private async isValidShapefileZip(file: File): Promise<boolean> {
    try {
      const zip = await JSZip.loadAsync(file); // Si JSZip está importado globalmente
      const fileNames = Object.keys(zip.files);
      const hasShp = fileNames.some(name => name.toLowerCase().endsWith('.shp'));
      const hasDbf = fileNames.some(name => name.toLowerCase().endsWith('.dbf'));
      const hasPrj = fileNames.some(name => name.toLowerCase().endsWith('.prj')); // Opcional para validación básica
      if (!hasPrj) {
        return false;
      }

      if (hasShp && hasDbf) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error al validar ZIP de Shapefile:", error);
      return false;
    }
  }

  private isValidGeoJSONContent(geoJsonContent: string): boolean {
    try {
      const parsed = JSON.parse(geoJsonContent);
      if (!parsed || (parsed.type !== 'FeatureCollection' && parsed.type !== 'Feature')) {
        return false;
      }

      if (parsed.type === 'FeatureCollection') {
        if (!Array.isArray(parsed.features)) {
          return false;
        }
        // Opcional: verificar si está vacío
        if (parsed.features.length === 0) {
          return true; // O false, dependiendo de tus requisitos
        }
        for (const feature of parsed.features) {
          if (!feature.type || feature.type !== 'Feature' || !feature.geometry || !feature.geometry.type || !feature.geometry.coordinates) {
            return false;
          }
          // Aquí podrías añadir validaciones más específicas de coordenadas si es necesario
        }
      } else if (parsed.type === 'Feature') {
         if (!parsed.geometry || !parsed.geometry.type || !parsed.geometry.coordinates) {
            return false;
          }
      }
      return true;
    } catch (error) {
      console.error("Error al validar GeoJSON:", error);
      return false;
    }
  }

  private isValidKMLContent(kmlText: string): boolean {
    try {
      const parser = new DOMParser();
      const kmlDocument = parser.parseFromString(kmlText, "application/xml");

      const errorNode = kmlDocument.querySelector('parsererror');
      if (errorNode) {
        console.error("Error al parsear KML:", errorNode.textContent);
        return false;
      }

      if (!kmlDocument.documentElement || kmlDocument.documentElement.nodeName.toLowerCase() !== 'kml') {
        return false;
      }
      
      const geoJsonOutput = toGeoJSON.kml(kmlDocument);
      
      if (!geoJsonOutput || (geoJsonOutput.type !== 'FeatureCollection' && geoJsonOutput.type !== 'Feature')) {
        return false;
      }
      if (geoJsonOutput.type === 'FeatureCollection' && !Array.isArray(geoJsonOutput.features)) {
        return false;
      }
      //Opcional: verificar si está vacío
      if (geoJsonOutput.type === 'FeatureCollection' && geoJsonOutput.features.length === 0) {
         return true; // o false
      }
      //Puedes reusar isValidGeoJSONContent si quieres validar más a fondo el geoJsonOutput
      return this.isValidGeoJSONContent(JSON.stringify(geoJsonOutput));
    } catch (error) {
      console.error("Error al validar KML:", error);
      return false;
    }
  }

  async validarContenidoArchivo(file: File, tipo: string): Promise<boolean> {
    try {
      if (tipo === 'zip') {
        return await this.isValidShapefileZip(file);
      } else if (tipo === 'geojson') {
        const geoJsonText = await file.text();
        return this.isValidGeoJSONContent(geoJsonText);
      } else if (tipo === 'kml') {
        const kmlText = await file.text();
        return this.isValidKMLContent(kmlText);
      } 
      return false; // Si el tipo no es válido, retorna false
    } catch (error) {
      console.error(`Error al validar el contenido del archivo tipo '${tipo}':`, error);
      return false;
    }
  }
  
  async validarPrjDeZip(file: File): Promise<boolean> {
    const JSZip = await import('jszip');
    const zip = await JSZip.default.loadAsync(file);

    for (const fileName of Object.keys(zip.files)) {
      if (fileName.endsWith('.prj')) {
        const prjText = await zip.files[fileName].async('text');
        // Puedes validar contra varias variantes
        if (
          prjText.includes('GCS_MAGNA') ||   // para EPSG:4686
          (prjText.includes('EPSG') && prjText.includes('4686'))
        ) {
          return true;
        } else {
          return false;
        }
      }
    }

    return false; // No hay archivo .prj
  }

  validarCoordenadasKml(geoJson: any): boolean {
    const coords = geoJson.features.flatMap((f: { geometry: { type: string; coordinates: any[]; }; }) => {
      if (f.geometry.type === 'Point') return [f.geometry.coordinates];
      if (f.geometry.type === 'LineString' || f.geometry.type === 'MultiPoint') return f.geometry.coordinates;
      if (f.geometry.type === 'Polygon') return f.geometry.coordinates.flat();
      return [];
    });

    return coords.every(([lon, lat]: [number, number]) => {
      return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
    });
  }

  async onFileSelected(event: any) {
    this.sharedMapService.toggleFeatureTable(false);
    this.loading = true;
    this.disabledTraslapeButton = true;
    this.disabledSaveButton = true;
    const input = event.target;
    const file: File | undefined = input.files[0];
    if (file) {
      const extension = file.name.split('.')?.pop()?.toLowerCase();

      const maxSizeMB = 10; // Tamaño máximo permitido en MB
      const maxSizeBytes = maxSizeMB * 1024 * 1024; // Conversión a bytes

      // Verifica el tamaño del archivo
      if (file.size > maxSizeBytes) {
        this.loading = false;
        this.sharedMapService.showErrorAlert(
          `El archivo cargado no cumple con el requisito del peso máximo permitido de <b>${maxSizeMB} Mb</b> (Megabytes). Por favor adjunte el archivo correspondiente.</b>`
        );
        return;
      }

      const isValidGeoContent = await this.validarContenidoArchivo(file, extension || '');
      if(!isValidGeoContent){
        this.sharedMapService.showErrorAlert('El archivo cargado no cumple con el formato de archivos permitidos: shapefile (comprimido en .zip), KML o GeoJSON. Por favor adjunte el archivo correspondiente.');
        this.loading = false;
        return;
      }

      // Verifica la extensión del archivo
      if (extension === 'zip') {
        this.loading = true;
        const esValido = await this.validarPrjDeZip(file);
        if (!esValido) {
          this.sharedMapService.showErrorAlert('El archivo cargado no cumple con el sistema de coordenadas geográficas requeridas: Magna_Sirgas: 4686. Por favor adjunte el archivo correspondiente.');
          this.loading = false;
          return;
        }

        this.generateFeatureCollection(file); // Procesa como un FeatureCollection
      } else if (extension === 'kml') {
        this.loading = true;
        this.procesarArchivo(file, 'kml'); // Nueva función para procesar archivos KML
      } else if (extension === 'geojson') {
        this.loading = true;
        this.procesarArchivo(file, 'geojson');// Nueva función para procesar archivos GeoJSON
      } else {
        this.loading = false;
        this.sharedMapService.showErrorAlert(
          `El archivo cargado no cumple con el formato de archivos permitidos: shapefile (comprimido en .zip), KML o GeoJSON. Por favor adjunte el archivo correspondiente.</b>`
        );
        return;
      }
    }

    input.value = null;
  }

  //Shape
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
            response.featureCollection.layers[0].featureSet.features[0].attributes,
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
        this.sharedMapService.showErrorAlert(`Error al procesar el archivo shapefile: ${error}`);
        this.loading = false;
      });
  }

  async procesarArchivo(file: File, tipoArchivo: 'kml' | 'geojson') {
    this.removeMapLayers();
    this.graphics = [];

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let geoJson: any;

        if (tipoArchivo === 'kml') {
          const kmlText = event?.target?.result;
          const parser = new DOMParser();
          //@ts-ignore
          const kmlDocument = parser.parseFromString(kmlText, "application/xml");
          geoJson = toGeoJSON.kml(kmlDocument);
          const esValido = this.validarCoordenadasKml(geoJson);
          if (!esValido) {
            this.sharedMapService.showErrorAlert('El archivo cargado no cumple con el sistema de coordenadas geográficas requeridas: Magna_Sirgas: 4686. Por favor adjunte el archivo correspondiente.');
            this.loading = false;
            return;
          }
        } else if (tipoArchivo === 'geojson') {
          geoJson = JSON.parse(event?.target?.result as string);
          const crs = geoJson?.crs?.properties?.name;
          if (!crs.includes('4686') && crs!== undefined) {
            this.sharedMapService.showErrorAlert('El archivo cargado no cumple con el sistema de coordenadas geográficas requeridas: Magna_Sirgas: 4686. Por favor adjunte el archivo correspondiente.');
            this.loading = false;
            return;
          }
        }

        const arcgisGeometryType = this.getGeometryTypeFromFile(geoJson.features);
        const fields = this.getFieldsFeature(geoJson.features);
        const features = this.getFeaturesFromFile(geoJson.features);

        this.areaLayer = new FeatureLayer({
          title: tipoArchivo === 'kml' ? "Archivo KML" : "Archivo GeoJSON",
          fields: fields,
          geometryType: arcgisGeometryType,
          source: features,
          fullExtent: this.calcularFullExtend(features),
          objectIdField: 'ObjectId',
          id: 'madsi-featureLayerFile'
        });

        this.sharedMapService.view.map.add(this.areaLayer);
        this.areaLayer.when(() => {
          this.sharedMapService?.view?.goTo(this.areaLayer.fullExtent);
        });
        const rendererPolygon: any = {
          type: 'simple',
          symbol: this.polygonSymbol,
        };
        this.areaLayer.renderer = rendererPolygon;

        this.addFilesToLayer(features);
        this.sharedMapService.showSuccessAlert('Su archivo cumple con las especificaciones geográficas requeridas, puede proceder a Calcular el traslape.');
        this.loading = false;

      } catch (error) {
        console.log(error);
      }
    };

    reader.onerror = () => {
      console.log(reader.error);
    };

    reader.readAsText(file);
  }

  // Calcular la extensión completa
  private calcularFullExtend(features: any[]): any {
    let xmin: number = 0, ymin: number = 0, xmax: number = 0, ymax: number = 0;

    features.forEach((feature) => {
      const geometry = feature.geometry;
      if (geometry && geometry.type === "polygon") {
        const coords = geometry.rings; // Para polígonos, las coordenadas están en "rings"
        coords.forEach((ring: any) => {
          xmin = xmin ? Math.min(xmin, Math.min(...ring.map((c: any) => c[0]))) : Math.min(...ring.map((c: any) => c[0]));
          ymin = ymin ? Math.min(ymin, Math.min(...ring.map((c: any) => c[1]))) : Math.min(...ring.map((c: any) => c[1]));
          xmax = xmax ? Math.max(xmax, Math.max(...ring.map((c: any) => c[0]))) : Math.max(...ring.map((c: any) => c[0]));
          ymax = ymax ? Math.max(ymax, Math.max(...ring.map((c: any) => c[1]))) : Math.max(...ring.map((c: any) => c[1]));
        });
      }
    });

    return new Extent({
      xmin: xmin,
      ymin: ymin,
      xmax: xmax,
      ymax: ymax,
      spatialReference: { wkid: 4686 }, // Asegúrate de usar el SR adecuado (WGS84)
    });
  }

  private getFieldsFeature(features: any) {

    const typeMapping = {
      string: "string",
      number: "double",  // Números decimales o enteros
      object: "blob",    // Si tienes un objeto complejo
      "null": "string",  // Puedes manejar null como string
      boolean: "string", // Cambiar boolean por string o algún otro tipo válido
    };

    const fields = Object.keys(features[0]?.properties || {}).map((key) => {
      const value = features[0].properties?.[key];
      //@ts-ignore
      const type = typeMapping[typeof value] || "string"; // Mapeo de tipo por defecto a string
      return {
        name: key,
        alias: key,
        type: type,
      };
    });

    const objectIdField = fields.find(field => field.name.toLowerCase() === 'id' || field.name.toLowerCase() === 'objectid');
    if (!objectIdField) {
      fields.push({
        name: 'ObjectId',
        alias: 'Object ID',
        type: 'oid',
      });
    }
    return fields;
  }

  private getFeaturesFromFile(features: any) {
    const resultFeatures = features.map((feature: any) => {
      let geometry = feature.geometry;
      if (geometry.type === "Polygon" || geometry.type === "polygon") {
        geometry = {
          type: "polygon",
          rings: geometry.coordinates,
        };
      } else if (geometry.type === "MultiPolygon" || geometry.type === "multipolygon") {
        geometry = {
          type: "polygon",
          rings: geometry.coordinates.flat(),
        };
      } else {
        return null;
      }

      return {
        attributes: feature.properties || {},
        geometry: geometry,
      };
    }).filter(Boolean);
    return resultFeatures;
  }

  private getGeometryTypeFromFile(features: any) {
    const geometryType = features[0]?.geometry?.type?.toLowerCase();
    //@ts-ignore
    const arcgisGeometryType = {
      point: "point",
      linestring: "polyline",
      polygon: "polygon",
    }[geometryType] || "polygon";

    return arcgisGeometryType;
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
          alert("termino de cargar el archivo");
          return result.item.itemID;
        } else {
          throw new Error('Error al cargar el archivo');
        }
      });
  }

  addFilesToLayer(features: Array<any>) {
    for (const feature of features) {
      const graphic = new Graphic({
        geometry: this.removeZFromGeometry(feature.geometry),
        attributes: this.extraerValoresSolicitud(),
      });
      this.graphics.push(graphic);
    }
    this.disabledTraslapeButton = false;

    this.sharedMapService.showSuccessAlert(
      `Se han cargado ${features.length} geometrías, dé clic en Guardar para continuar con el proceso`
    );
  }

  validateRequiredFields(data: any, requiredFields: string[]): Array<String[]> {
    const missingFields: string[] = [];
    const nullFields: string[] = [];

    for (let field of requiredFields) {
      if (!data.hasOwnProperty(field)) {
        missingFields.push(field);
      } else if (
        data[field] === null ||
        data[field] === undefined ||
        data[field] === ''
      ) {
        nullFields.push(field);
      }
    }

    return [missingFields, nullFields];
  }

  addShapefileToMap(featureCollection: any): void {
    this.removeMapLayers();
    this.graphics = [];

    const layers: any = [];
    let fullExtent: any = null;
    const layersLength = featureCollection.layers.length;
    let index = 0;
    const idLayer = 'madsi-featureLayerFile';
    const filterAreaLayer = this.sharedMapService.view?.map?.findLayerById(idLayer);

    for (const layer of featureCollection.layers) {
      this.areaLayer = new FeatureLayer({
        id: idLayer,
        objectIdField: 'ObjectID',
        title: featureCollection.layers[0].layerDefinition.name,
      });

      switch (layer.featureSet.geometryType) {
        case 'esriGeometryPoint':
          this.sharedMapService.showErrorAlert(
            'El archivo cargado tiene geometría tipo punto. Por favor adjunte el archivo con geometría tipo polígono.'
          );
          break;
        case 'esriGeometryPolygon':

          if (layer.featureSet.features.length == 0) {
            this.sharedMapService.showErrorAlert(
              'No existen geometrías para cargar'
            );
          } else {
            let features = layer.featureSet.features;
            let tienePoligonos = true;

            if (features.length == 0) {
              tienePoligonos = false;
            }

            if (!tienePoligonos) {
              this.sharedMapService.showErrorAlert(
                'No se puede cargar, no existen geometrías para cargar.'
              );
            } else {
              const rendererPolygon: any = {
                type: 'simple',
                symbol: this.polygonSymbol,
              };

              for (const feature of layer.featureSet.features) {
                feature.geometry = new Polygon({
                  rings: feature.geometry.rings,
                  spatialReference: feature.geometry.spatialReference,
                });

                const graphic = new Graphic({
                  geometry: feature.geometry,
                  attributes: {
                    ...this.extraerValoresSolicitud(),
                    spatialReference: new SpatialReference({ wkid: 4686 })
                  },
                });
                this.graphics.push(graphic);
              }
              this.areaLayer.renderer = rendererPolygon;
              this.disabledTraslapeButton = false;

              this.sharedMapService.showSuccessAlert(
                `Su archivo cumple con las especificaciones geográficas requeridas, puede proceder a Calcular el traslape.`
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
          break;
        case 'esriGeometryPolyline':
          this.sharedMapService.showErrorAlert(
            'El archivo cargado tiene geometría tipo línea. Por favor adjunte el archivo con geometría tipo polígono.'
          );
          break;
        default:
          this.sharedMapService.showErrorAlert('No es valido el archivo.');
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

  async onSaveClick(){
    this.disabledSaveButton = true;

    const { url: capaFact } = this.getLayerUrl("INICIATIVAS", "INICIATIVAS_FACTIBILIDAD");
    const featureLayer = new FeatureLayer({
      url: capaFact,
      customParameters: {
        token: this.tokenService.token
      }
    });

    // Validar que resultadoFinalTraslape esté definido
    if (!this.resultadoFinalTraslape) {
      this.sharedMapService.showErrorAlert(
        'Debe calcular el traslape antes de guardar. Por favor, haga clic en "Calcular Traslape" y luego intente guardar.'
      );
      this.disabledSaveButton = false;
      return;
    }
    
    this.openRenareConfirmation = false;

    if (this.idSolicitud.length == 0) {
      this.sharedMapService.showErrorAlert(
        'No se pueden guardar las geometrías, la idSolicitud no existe'
      );
    } else {
      
      this.valueNoDomainFields = []; 
       
      const addEdits = {
        addFeatures: this.graphics.map(graphic => {
          const areaMt2 = geometryEngine.geodesicArea(graphic.geometry, "square-meters");
          const areaHa = areaMt2 / 10000;
          graphic.attributes.estado_traslape = this.resultadoFinalTraslape?.resultado;
          graphic.attributes.fec_trasl_polig = this.resultadoFinalTraslape?.fechaTraslape;;
          graphic.attributes.area_mt2 = parseFloat(areaMt2.toFixed(3));
          graphic.attributes.area_ha = parseFloat(areaHa.toFixed(3));
          return graphic;
        }),
      };

      this.openProgress = true;
      await this.applyEditsToLayer(featureLayer, addEdits);
    }
    this.disabledSaveButton = false;
    return
  }

  applyEditsToLayer(featureLayer: FeatureLayer,  edits: any): void {
    featureLayer
      .applyEdits(edits)
      .then((results: any) => {
        this.disabledSaveButton = false;
        if (results.addFeatureResults.length) {

          for (const result of results.addFeatureResults) {
            if (result.error) {
              console.error("Error al agregar feature:", result.error);
              throw new Error(`${result.error.message || result.error}`);
            }
          }
          let objectIds: any[] = [];
          results.addFeatureResults.forEach((item: any) => {
            objectIds.push(item.objectId);
          });

          featureLayer
            .queryFeatures({
              objectIds: objectIds,
            })
            .then((results: any) => {
              this.openRenareConfirmation = false;
              this.openProgress = false;
              this.disabledSaveButton = false;
              this.sharedMapService.showSuccessAlert(
                `Se agregaron ${results.features.length} geometrías a la capa de iniciativas en Factibilidad correctamente.`
              );
            })
            .catch((error: any) => {
              this.openRenareConfirmation = false;
              this.openProgress = false;
              this.sharedMapService.showErrorAlert(
                `Error al guardar las geometrías en la capa <br> ${error.message}`
              );
              console.error(error);
            });
        }
      }).catch((error: any) => {
          this.openRenareConfirmation = false;  
          this.openProgress = false;
          this.disabledSaveButton = false;
          this.sharedMapService.showErrorAlert(
            `Error al guardar las geometrías a la capa: ${error.message}`
          );
      });
  }

  removeMapLayers(layers: any[] = ['madsi-featureLayerFile', 'madsi-featureLayerTraslape']): void {

    for (const item of layers) {
      const foundLayer = this.sharedMapService?.view?.map.allLayers.find(
        (layer: any) => {
          return layer.id === item;
        }
      );
      if (foundLayer) {
        this.sharedMapService?.view?.map.layers.remove(foundLayer);
      }
    }
  }

  async createTable(layer: any) {
    this.sharedMapService.featureTable.layer = layer;
    this.sharedMapService.toggleFeatureTable(true);
  }

  setLayers() {
    this.layersToIntercept = [];
    this.sharedMapService.config.mapType.layersToIntersect.forEach((item: any) => {
      let layer = new FeatureLayer({
        url: item.url,
        title: item.title,
        outFields: item.fields
      });
      this.layersToIntercept.push(layer);
    });
  }

  async onIntersectClick() {
    this.openRenareConfirmation = false;
    this.openAdvertenciaTraslape = false;
    this.sharedMapService.toggleFeatureTable(false);
    this.sharedMapService.showWarningAlert(
      'Iniciando cálculo de traslape...'
    );

    if (this.layersToIntercept.length == 0) {
      this.sharedMapService.showErrorAlert(
        'No existen capas con las cuales interceptar el polígono.'
      );
      return;
    }

    const userShape = this.areaLayer.source;
    if (!userShape) {
      this.sharedMapService.showErrorAlert(
        'No se ha cargado ningún poligono para realizar el cálculo del traslape'
      );
      this.loadingTraslape = false;
      return;
    }

    let featuresFinales: any[] = [];
    let tipoTraslapeFinalArray: any[] = ["No existe traslape"];
    this.loadingTraslape = true;
    this.disabledTraslapeButton = true;
    this.disabledLoadButton = true;
    this.disabledSaveButton = true;
    this.traslapeRUNAP = false;
    this.traslapeANLA = false;
    this.traslapeProyectoREDMAS = false;
    this.traslapeProgramaREDMAS = false;
    this.traslapeConImplementadas = false;

    for (const feature of userShape) {
      const featureGeometry = feature.geometry; //Actualizar esta parte a múltiples polígonos

      if (this.layersToIntercept.length > 0) {
        // Traslape con Capa de implementación
        const { featuresFinales: featuresFinalesImp, tipoTraslapeFinalArray: tipoTraslapeFinalArrayImp, features: featuresImp } = await this.runTraslape(
          featureGeometry, "INICIATIVAS", "INICIATIVAS_IMPLEMENTACION", "runTraslapeConIniciativas", featuresFinales, tipoTraslapeFinalArray);
        featuresFinales = featuresFinalesImp;
        tipoTraslapeFinalArray = tipoTraslapeFinalArrayImp;
        if( featuresImp.length > 0){
            this.traslapeConImplementadas = true;
        }

        // Validaciones de proyecto REDD+
        if (this.solicitud?.tipo_iniciativa == "121") {
          const { featuresFinales: featuresFinalesForm, tipoTraslapeFinalArray: tipoTraslapeFinalArrayForm, features: featuresForm } = await this.runTraslape(
            featureGeometry, "INICIATIVAS", "INICIATIVAS_FORMULACION", 'runTraslapeConIniciativas', featuresFinales, tipoTraslapeFinalArray);
          featuresFinales = featuresFinalesForm;
          tipoTraslapeFinalArray = tipoTraslapeFinalArrayForm;
          if( featuresForm.length > 0){
            this.traslapeProyectoREDMAS = true;
          }
          
          const { featuresFinales: featuresFinalesFact, tipoTraslapeFinalArray: tipoTraslapeFinalArrayFact, features: featuresFact } = await this.runTraslape(
            featureGeometry, "INICIATIVAS", "INICIATIVAS_FACTIBILIDAD", 'runTraslapeConIniciativas', featuresFinales, tipoTraslapeFinalArray);
          featuresFinales = featuresFinalesFact;
          tipoTraslapeFinalArray = tipoTraslapeFinalArrayFact;

          if( featuresFact.length > 0 ){
            this.traslapeProyectoREDMAS = true;
          }
        }

        // Validaciones de las capas informativas
        const { featuresFinales: featuresFinalesRunap, tipoTraslapeFinalArray: tipoTraslapeFinalArrayRunap, features: featureRunap } = await this.runTraslape(
          featureGeometry, "RUNAP", "RUNAP", 'runTraslapeInformativo', featuresFinales, tipoTraslapeFinalArray);
        featuresFinales = featuresFinalesRunap;
        tipoTraslapeFinalArray = tipoTraslapeFinalArrayRunap;
        if( featureRunap.length > 0){
            this.traslapeRUNAP = true;
        }    

        /*const { featuresFinales: featuresFinalesAnlaComp2012, tipoTraslapeFinalArray: tipoTraslapeFinalArrayAnlaComp2012, features: featureAnlaComp2012 } = await this.runTraslape(
          featureGeometry, "ANLA", "COMPENSACIONES_ANTES_2012_DONDE_COMO", 'runTraslapeInformativo', featuresFinales, tipoTraslapeFinalArray);
        featuresFinales = featuresFinalesAnlaComp2012;
        tipoTraslapeFinalArray = tipoTraslapeFinalArrayAnlaComp2012;
        if( featureAnlaComp2012.length > 0){
            this.traslapeANLA = true;
        }    

        const { featuresFinales: featuresFinalesAnlaMACPB, tipoTraslapeFinalArray: tipoTraslapeFinalArrayAnlaMACPB, features: featureAnlaMACPB } = await this.runTraslape(
          featureGeometry, "ANLA", "COMPENSACIONES_MACPB_2012_DONDE_COMO", 'runTraslapeInformativo', featuresFinales, tipoTraslapeFinalArray);
        featuresFinales = featuresFinalesAnlaMACPB;
        tipoTraslapeFinalArray = tipoTraslapeFinalArrayAnlaMACPB;
        if( featureAnlaMACPB.length > 0){
            this.traslapeANLA = true;
        }    

        const { featuresFinales: featuresFinalesAnla, tipoTraslapeFinalArray: tipoTraslapeFinalArrayAnlaMCCB, features: featureAnlaMCCB } = await this.runTraslape(
          featureGeometry, "ANLA", "COMPENSACIONES_MCCB_2018_DONDE_COMO", 'runTraslapeInformativo', featuresFinales, tipoTraslapeFinalArray);
        featuresFinales = featuresFinalesAnla;
        tipoTraslapeFinalArray = tipoTraslapeFinalArrayAnlaMCCB;
        if( featureAnlaMCCB.length > 0){
            this.traslapeANLA = true;
        }*/   
      }
    }

    //Limpiar datos
    for (const item of featuresFinales) {
      delete item.idIniciativa;
      delete item.objectid;
    }

    if (featuresFinales.length > 0) {
      this.addTable(featuresFinales);
    }

    for (const item of featuresFinales) {
      delete item.feature;
    }

    const tipoTraslapeFinal = this.getTraslapeFinal(tipoTraslapeFinalArray);
    
    const resultadoFinal = {
      resultado: tipoTraslapeFinal?.mensajeModal,
      detalles: featuresFinales,
      timestamp: new Date(new Date().toLocaleString('en-US', {timeZone:'America/Bogota'})).getTime(),
      corrioTraslape: true
    }
    this.resultadoFinalTraslape = {
      resultado: resultadoFinal.resultado,
      fechaTraslape: resultadoFinal.timestamp
    }; 
    
    if (this.resultadoTraslape) {
      this.resultado = this.resultadoTraslape(resultadoFinal);
    }
    //Emision de evento
    if (this.resultadoTraslapeEvent?.nativeElement) {
      const event = new CustomEvent('resultadoTraslape', { detail: resultadoFinal });
      this.resultadoTraslapeEvent.nativeElement.dispatchEvent(event);
    }
    
    // console.log("resultadoFinal", resultadoFinal);
    this.disabledTraslapeButton = false;
    this.disabledLoadButton = false;
    this.disabledSaveButton = false;
    this.loadingTraslape = false;
    this.openTraslape = true;
    this.traslapeRunned = true;
    let messageFinal = this.getMensajeTraslapeFinal(tipoTraslapeFinal.mensaje); 
  
    this.sharedMapService.showSuccessAlert(
      messageFinal
    );
    this.messageResultadoTraslape = `La iniciativa de mitigación de GEI que pretende inscribir en la fase de Factibilidad presenta un ${tipoTraslapeFinal}. Debe guardar su polígono haciendo clic en el botón Guardar Archivo.`;
    return resultadoFinal;
  }

  private async runTraslape(
    featureGeometry: any,
    layerId: string,
    subLayerName: string,
    runMethod: 'runTraslapeConIniciativas' | 'runTraslapeInformativo',
    featuresFinales: any[],
    tipoTraslapeFinalArray: any[]
  ) {
    const { url, name } = this.getLayerUrl(layerId, subLayerName);
    const result = await this[runMethod](featureGeometry, url, name);

    featuresFinales.push(...result.featuresFinales);
    tipoTraslapeFinalArray.push(result.tipoTraslapeFinal);

    return { featuresFinales, tipoTraslapeFinalArray, features: result.featuresFinales };
  }

  private getLayerUrl(layerId: string, subLayerName: string): { url: string; title: string, name: string } {
    const layer = this.sharedMapService.config.mapType.layersToIntersect.find(
      (layer: { id: any }) => layer.id === layerId
    );

    if (!layer) {
      throw new Error(`Layer with ID '${layerId}' not found.`);
    }

    const subLayer = layer.layersId.find((item: any) => item.name === subLayerName);
    if (!subLayer) {
      throw new Error(`SubLayer '${subLayerName}' not found in Layer '${layerId}'.`);
    }

    return { url: `${layer.url}/${subLayer.id}`, title: subLayer.title, name: subLayer.name };
  }

  private getTraslapeFinal(resultadoFinalArray: string[]) : any {

      let resultadoFinal = { // Última prioridad
        mensaje: "No existe traslape",
        tipo: "No existe traslape",
        mensajeModal: "No se presenta traslape."
      };

      for (const tipo of resultadoFinalArray) {
        if (tipo === "Traslape No Compatible") {

          //PROYECTO REDD+
          if(this.traslapeProyectoREDMAS && this.solicitud?.tipo_iniciativa == "121"){
            if(this.traslapeConImplementadas){
              resultadoFinal.mensaje = `La iniciativa de mitigación de GEI de tipo Proyecto REDD+ que pretende inscribir en la fase de Factibilidad presenta un <b>Traslape de tipo No Compatible</b> con una Iniciativa de Implementación y con un Programa REDD+. Debe guardar su polígono haciendo clic en el botón Guardar Archivo`;
            }else{
              resultadoFinal.mensaje = `La iniciativa de mitigación de GEI de tipo Proyecto REDD+ que pretende inscribir en la fase de Factibilidad presenta un <b>Traslape de tipo No Compatible</b> no restrictivo con un Programa REDD+. Debe guardar su polígono haciendo clic en el botón Guardar Archivo`;
            }
            resultadoFinal.tipo = "Traslape No Compatible";
            resultadoFinal.mensajeModal = "Se presenta un traslape de tipo NO Compatible con un Programa REDD+.";
            return resultadoFinal;
          }
          
          //PROGRAMA REDD+
          if(this.traslapeProgramaREDMAS && this.solicitud?.tipo_iniciativa == "122"){
            resultadoFinal.mensaje = `La iniciativa de mitigación de GEI de tipo Programa REDD+ que pretende inscribir en la fase de Factibilidad presenta un <b>Traslape de tipo No Compatible</b> con una Iniciativa de Implementación de tipo Proyecto REDD+. Debe guardar su polígono haciendo clic en el botón Guardar Archivo`;
            resultadoFinal.tipo = "Traslape No Compatible";
            resultadoFinal.mensajeModal = "Se presenta un traslape de tipo NO Compatible con un Programa REDD+.";
            return resultadoFinal;
          }

          //Tipo de iniciativa diferente a REDD+
          resultadoFinal.mensaje = `Traslape de tipo No Compatible. Si desea guardar el polígono que presenta el traslape No compatible, haga clic en el botón 'Guardar Archivo' o puede volver a cargar un nuevo polígono y realizar un nuevo cálculo de traslape. 
                Tenga en cuenta que puede finalizar su registro con el traslape NO compatible y guardar en borrador, sin embargo, no podrá radicar su solicitud hasta que su iniciativa no presente traslapes No compatibles `; // Prioridad más alta, se detiene aquí
          resultadoFinal.tipo = "Traslape No Compatible";
          resultadoFinal.mensajeModal = "Se presenta un traslape de tipo NO compatible.";
          return resultadoFinal;
        }
      }
      for (const tipo of resultadoFinalArray) {
        if (tipo === "Traslape Compatible") {
          resultadoFinal.mensaje = "<b>Traslape de tipo Compatible, no restrictivo</b>. Debe guardar su polígono haciendo clic en el botón Guardar Archivo"; // Segunda prioridad
          resultadoFinal.tipo = "Traslape Compatible";
          resultadoFinal.mensajeModal = "Se presenta un traslape de tipo compatible.";
          return resultadoFinal;
        }
      }
      for (const tipo of resultadoFinalArray) {
        if (tipo === "Traslape Informativo") {
          resultadoFinal.tipo = "Traslape Informativo";
          if(this.traslapeANLA && this.traslapeRUNAP){
            resultadoFinal.mensaje = 'Análisis de traslape finalizado. Tenga en cuenta que su iniciativa se está desarrollando dentro de un área asociada a compensaciones del componente biótico de proyectos licenciados y dentro de un área protegida. Se recomienda revisar. Si desea guardar el polígono, haga clic en el botón "Guardar Archivo"';
            resultadoFinal.mensajeModal = "Se presenta un traslape informativo con Registro Único de Áreas protegidas - RUNAP y con Compensaciones ambientales - ANLA.";
            return resultadoFinal;
          }else if(this.traslapeANLA){
            resultadoFinal.mensaje = 'Análisis de traslape finalizado. Tenga en cuenta que su iniciativa se está desarrollando dentro de un área asociada a compensaciones del componente biótico de proyectos licenciados. Se recomienda revisar.Si desea guardar el polígono, haga clic en el botón "Guardar Archivo".';
            resultadoFinal.mensajeModal = "Se presenta un traslape informativo con Compensaciones ambientales - ANLA.";
            return resultadoFinal;
          }else if(this.traslapeRUNAP){
            resultadoFinal.mensaje = 'Análisis de traslape finalizado. Tenga en cuenta que su iniciativa se está desarrollando dentro de un área protegida. Se recomienda revisar. Si desea guardar el polígono, haga clic en el botón "Guardar Archivo".';
            resultadoFinal.mensajeModal = "Se presenta un traslape informativo con Registro Único de Áreas protegidas - RUNAP.";
            return resultadoFinal;
          }else{
            resultadoFinal.mensaje = "Traslape de tipo Informativo"; // Tercera prioridad
          }
          return resultadoFinal;
        }
    }

    return resultadoFinal; // Última prioridad
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  }
  private getMensajeTraslapeFinal(resultadoFinal: any) {  
    if (resultadoFinal === "No existe traslape") {
      return `Análisis de traslape finalizado. No se encontraron traslapes. Si desea guardar el polígono, haga clic en el botón "Guardar Archivo".`;
    } else {
      return `La iniciativa de mitigación de GEI que pretende inscribir en la fase de Factibilidad presenta un ${resultadoFinal}. `;
    }
  }

  private addTable(features: any) {

    if (features.length === 0) {
      return;
    }

    const resultFeatures = [];
    const fields = [];

    for (const item of features) {
      let geometryFeature = item.feature?.geometry;
      delete item.feature;

      let localFeature = {
        attributes: { ...item },
        geometry: geometryFeature
      };
      resultFeatures.push(localFeature);
    }

    for (const item of Object.keys(features[0])) {
      fields.push({ name: item, alias: item, type: "string" },);
    }
    fields.push({ name: "ObjectId", alias: "ID", type: "oid" },);

    const arcgisGeometryType = this.getGeometryTypeFromFile(resultFeatures);

    const featureLayerTable = new FeatureLayer({
      title: "Polígono con el que se cruza",
      //@ts-ignore
      fields: fields,
      geometryType: arcgisGeometryType,
      source: resultFeatures,
      fullExtent: this.calcularFullExtend(resultFeatures),
      objectIdField: 'ObjectId',
      id: 'madsi-featureLayerTraslape',
      spatialReference: new SpatialReference({ wkid: 4686 }),
      renderer: new SimpleRenderer({
        symbol: this.polygonSymbolTraslape,
      }),
    });

    this.sharedMapService.view.map.add(featureLayerTable)
    this.createTable(featureLayerTable);
  }

  private async runTraslapeInformativo(featureGeometry: any, capaInformativas: string, nombreCapa: string): Promise<{ featuresFinales: any[]; tipoTraslapeFinal: string; }> {

    const filtro = capaInformativas === this.sharedMapService.config.mapType.layersToIntersect.find((layer: { id: any; }) => layer.id === "RUNAP") ?  //Agregar filtro para la capa de RUNAP
      `AP_CATEGORIA='Parque Nacional Natural' OR AP_CATEGORIA='Area Natural Unica' OR 
                  AP_CATEGORIA='Reserva Natural' OR AP_CATEGORIA='Santuario de Fauna y Flora' OR 
                  AP_CATEGORIA='Santuario de Fauna' OR AP_CATEGORIA='Santuario de Flora' OR 
                  AP_CATEGORIA='Via Parque' OR AP_CATEGORIA='Parques Naturales Regionales' OR 
                  AP_CATEGORIA='Reservas Forestales Protectoras Nacionales' OR AP_CATEGORIA='Reservas Forestales Protectoras Regionales'` : null;

    let tipoTraslapeFinal = "No existe traslape";

    const queryOptions: QueryOptions = {
      outFields: ['*'],
      filtro,
      returnGeometry: true
    };

    const resultadoGeografico = await this.runTraslapeGeografico(featureGeometry, capaInformativas, queryOptions);
    let featuresFinales: any = [];
    if (resultadoGeografico?.features?.length > 0) {
      tipoTraslapeFinal = "Traslape Informativo";
      featuresFinales = this.validateFeatureTraslape(featureGeometry, resultadoGeografico.features, { nombre: "Traslape Informativo", idTipoTraslape: "traslapeInformativo" }, nombreCapa);
    }
    return {
      featuresFinales,
      tipoTraslapeFinal
    };
  }

  private async runTraslapeConIniciativas(featureGeometry: any, capaIniciativas: string, nombreCapa: string): Promise<{ featuresFinales: any[]; tipoTraslapeFinal: string; }> {

    let featuresFinales: any[] = [];
    let tipoTraslapeFinal = "No existe traslape";
    let idTipoTraslape = "";
    const capas = ["INICIATIVAS_FACTIBILIDAD", "INICIATIVAS_FORMULACION", "INICIATIVAS_IMPLEMENTACION"];
    const debeFiltrarEstado = capas.some(estado => nombreCapa.includes(estado));
    let filtro = debeFiltrarEstado ? " ESTADO!='ARCHIVADO' " : null;
    
    //Validar tipo iniciativa de tipo proyecto RED++ con programa REDD+ en factibilidad 
    if(this.solicitud?.tipo_iniciativa == "121" && (nombreCapa.includes("INICIATIVAS_FACTIBILIDAD"))){
      filtro = filtro ? ` ${filtro} AND ID_TP_INIC_MITG=122 AND ESTADO!='RADICADA' ` : " ID_TP_INIC_MITG=122 AND ESTADO!='Factibilidad Solicitud paso a formulación' "; //122 es el id del tipo de iniciativa Proyecto REDD+
    }

    //Validar tipo iniciativa de tipo proyecto RED++ con programa REDD+ en formulación 
    if(this.solicitud?.tipo_iniciativa == "121" && (nombreCapa.includes("INICIATIVAS_FORMULACION"))){
      filtro = filtro ? ` ${filtro} AND ID_TP_INIC_MITG=122 ` : " ID_TP_INIC_MITG=122 "; //122 es el id del tipo de iniciativa Proyecto REDD+
    }

    //Consulta geografica
    const queryOptions: QueryOptions = {
      outFields: ['*'],
      filtro,
      returnGeometry: true
    };
    const resultadoGeografico = await this.runTraslapeGeografico(featureGeometry, capaIniciativas, queryOptions);
    if (resultadoGeografico.features.length > 0) { //Existe una interseccion geografica
      tipoTraslapeFinal = "Traslape Compatible";
      idTipoTraslape = "traslapeCompatible";

      //calcular del resultado cruces por fecha 
      const resultadoTipoActividad = this.runTraslapeTipoActividad(resultadoGeografico.features);
      const resultadoTraslapeFechas = this.runTraslapeFechas(resultadoGeografico.features);

      if (resultadoTipoActividad?.length === 0 && resultadoTraslapeFechas?.length === 0) {
        featuresFinales = this.validateFeatureTraslape(featureGeometry, resultadoGeografico.features, { nombre: "Traslape Compatible", idTipoTraslape: "traslapeCompatible" }, nombreCapa);
      } else if (resultadoTipoActividad?.length === 0 && resultadoTraslapeFechas?.length > 0) {

        const featuresOriginales = this.validateFeatureTraslape(featureGeometry, resultadoGeografico.features, { nombre: "Traslape Compatible", idTipoTraslape: "traslapeCompatible" }, nombreCapa);
        const featuresFechas = this.validateFeatureTraslape(featureGeometry, resultadoTraslapeFechas, { nombre: "Traslape Compatible", idTipoTraslape: "traslapeCompatible" }, nombreCapa);
        featuresFinales = Array.from(
          //@ts-ignore
          new Map([...featuresOriginales, ...featuresFechas].map(item => [item.objectid, item])).values()
        );

      } else if (resultadoTipoActividad?.length > 0 && resultadoTraslapeFechas?.length === 0) {
        const featuresOriginales = this.validateFeatureTraslape(featureGeometry, resultadoGeografico.features, { nombre: "Traslape Compatible", idTipoTraslape: "traslapeCompatible" }, nombreCapa);
        const featuresActividades = this.validateFeatureTraslape(featureGeometry, resultadoTipoActividad, { nombre: "Traslape Compatible", idTipoTraslape: "traslapeCompatible" }, nombreCapa);
        featuresFinales = Array.from(
          //@ts-ignore
          new Map([...featuresOriginales, ...featuresActividades].map(item => [item.objectid, item])).values()
        );

      } else if (resultadoTipoActividad?.length > 0 && resultadoTraslapeFechas?.length > 0) {

        //Buscar los elementos del array de tipo de actividad en el array de fechas para validar TRASLAPE NO COMPATIBLE - los elementos puedes ser diferentes.
        let featuresFinalTraslape: any[] = [];
        for (const featureItem of resultadoTipoActividad) {
          const resultSearch = resultadoTraslapeFechas.find(((item: any) => item.objectid === featureItem.objectid));
          if (resultSearch) {
            let tempNoCompatible = this.validateFeatureTraslape(featureGeometry, [featureItem], { nombre: "Traslape No Compatible", idTipoTraslape: "traslapeNoCompatible" }, nombreCapa);
            featuresFinalTraslape = [...tempNoCompatible, ...featuresFinalTraslape];
            tipoTraslapeFinal = "Traslape No Compatible";
            idTipoTraslape = "traslapeNoCompatible";
          } else {
            let tempNoCompatible = this.validateFeatureTraslape(featureGeometry, [featureItem], { nombre: "Traslape Compatible", idTipoTraslape: "traslapeCompatible" }, nombreCapa);
            featuresFinalTraslape = [...tempNoCompatible, ...featuresFinalTraslape];
          }
        }

        //Buscar los elementos del array de fechas en el array de tipo de actividad para validar TRASLAPE NO COMPATIBLE - los elementos puedes ser diferentes.
        for (const featureItem of resultadoTraslapeFechas) {
          const resultSearch = resultadoTipoActividad.find(((item: any) => item.id_inic_sistema === featureItem.id_inic_sistema));
          if (resultSearch) {
            let tempNoCompatible = this.validateFeatureTraslape(featureGeometry, resultadoGeografico.features, { nombre: "Traslape No Compatible", idTipoTraslape: "traslapeNoCompatible" }, nombreCapa);
            featuresFinalTraslape = [...tempNoCompatible, ...featuresFinalTraslape];
            tipoTraslapeFinal = "Traslape No Compatible";
            idTipoTraslape = "traslapeNoCompatible";
          } else {
            let tempCompatible = this.validateFeatureTraslape(featureGeometry, resultadoGeografico.features, { nombre: "Traslape Compatible", idTipoTraslape: "traslapeCompatible" }, nombreCapa);
            featuresFinalTraslape = [...tempCompatible, ...featuresFinalTraslape];
          }
        }

        let featuresOriginales = this.validateFeatureTraslape(featureGeometry, resultadoGeografico.features, { nombre: tipoTraslapeFinal, idTipoTraslape }, nombreCapa);

        featuresFinales = Array.from(
          new Map([...featuresFinalTraslape, ...featuresOriginales].map(item => [item.objectid, item])).values()
        );

      }
    }

    // Filtrar los features donde id_tp_inic_mitg es 121 (Proyecto REDD+)
    const featuresProgramaREDMas = featuresFinales.filter(feature => {
      return feature && feature.attributes && feature.attributes.id_tp_inic_mitg === 121;
    });

    if (featuresProgramaREDMas.length > 0) {
      console.log(`Se encontraron ${featuresProgramaREDMas.length} features con id_tp_inic_mitg: 121`);
      this.traslapeProgramaREDMAS = true;
    }

    return {
      featuresFinales,
      tipoTraslapeFinal
    };
  }

  private validateFeatureTraslape(featureGeometry: any, features: any[], traslape: { nombre: string, idTipoTraslape: string }, nombreCapa = '') {
    //@ts-ignore
    const detalleTraslape = [];

    //calcular porcentaje de cruce
    for (const feature of features) {

      /*const newSpatialReference = new SpatialReference({ wkid: 4686 });
      feature.geometry.spatialReference = newSpatialReference;*/
      const objetoPorcentaje = this.calcularPorcentajeInterseccion(featureGeometry, feature);
      const idItem = feature.getAttribute("objectid") || feature.getAttribute("id_inic_sistema") || feature.getAttribute("ap_id") || feature.getAttribute("id");
      const title = this.stripHtml(this.getMensajeTraslapeFinal(traslape?.nombre));

      let objetoDetalle = {
        "...": traslape?.idTipoTraslape == "traslapeNoCompatible" ?
          `<div title="${title}" style="display: flex; justify-content: center; align-items: center; height: 100%;"> 
              <span class="esri-icon-notice-triangle" 
                    style="font-size: 24px; color: red;" 
                    title="${title}">
              </span>
            </div>` :
          `<div title="${title}" style="display: flex; justify-content: center; align-items: center; height: 100%;"> 
              <span class="esri-icon-notice-triangle" 
                    style="font-size: 24px; color: orange;" 
                    title="${title}">
              </span>
            </div>`,
        "Tipo": traslape?.nombre,
        "Nombre": feature.getAttribute("nom_inic_mitg") || feature.getAttribute("ap_nombre") || 
                  (feature.getAttribute("descripcio") || feature.getAttribute("nom_predio") || feature.getAttribute("expediente")) ,
        "Capa": nombreCapa,
        "Área (M2)": `${objetoPorcentaje.area} m2`,
        "Área traslapada (%)": `${objetoPorcentaje.porcentaje}%`,
        "idIniciativa": idItem,
        "objectid": feature.getAttribute("objectid"),
        "feature": feature
      };
      //@ts-ignore
      //const elemento = detalleTraslape.find((item) => item.objectid === objetoDetalle?.objectid);
      //if (!elemento) {
        detalleTraslape.push(objetoDetalle);
      //}
    }
    return detalleTraslape;
  }

  async getSolicitudGeografico(servicio: string, options: QueryOptions): Promise<__esri.FeatureSet> {
    //Consulta
    const queryParamas = new Query({
      outFields: options.outFields,
      returnGeometry: options.returnGeometry,
      ...(options.filtro ? { where: options.filtro } : {})
    });

    const result = await query.executeQueryJSON(
      servicio,
      queryParamas,
      { token: this.tokenService.token }
    );

    return result;
  }

  async runTraslapeGeografico(featureGeometry: any, servicio: string, options: QueryOptions): Promise<__esri.FeatureSet> {
    //Consulta
    const queryParamas = new Query({
      outFields: options.outFields,
      returnGeometry: options.returnGeometry,
      geometry: featureGeometry,
      returnQueryGeometry: true,
      geometryPrecision: 5,
      spatialRelationship: "intersects", 
      ...(options.filtro ? { where: options.filtro } : {})
    });

    const result = await query.executeQueryJSON(
      servicio,
      queryParamas,
      { token: this.tokenService.token }
    );

    return result;
  }

  runTraslapeFechas(features: any[]): any {
    if (!features || features?.length == 0) {
      return [];
    }

    const resultadoFeatures = [];

    let fechaInicialActividad = new Date(this.fechaInicialActividad).getTime() || null;
    let fechaFinalActividad = new Date(this.fechaFinalActividad).getTime() || null;


    // Obtener las fechas de inicio y fin de los parámetros
    //@ts-ignore
    const dateEnd = this.getFormatDate(fechaFinalActividad);
    //@ts-ignore
    const dateStart = this.getFormatDate(fechaInicialActividad);

    //calcular porcentaje de cruce
    for (const feature of features) {
      if (feature.getAttribute("fec_inio_activ") && feature.getAttribute("fec_fin_activ")) {

        const dateStartFeature = this.getFormatDate(feature.getAttribute("fec_inio_activ"));
        const dateEndFeature = this.getFormatDate(feature.getAttribute("fec_fin_activ"));

        // Convierte las fechas a objetos Date (si no lo son)
        const start1 = new Date(dateStartFeature);
        const end1 = new Date(dateEndFeature);
        const start2 = new Date(dateStart);
        const end2 = new Date(dateEnd);

        // Verifica si el segundo rango está contenido en el primer rango
        const isContained = start2 >= start1 && end2 <= end1;

        // Verifica si los rangos son iguales
        const isEqual = start1.getTime() === start2.getTime() && end1.getTime() === end2.getTime();

        // Verifica si los rangos se cruzan
        const isOverlap = (start2 <= end1 && end2 >= start1);

        if (isContained || isEqual || isOverlap) {
          resultadoFeatures.push(feature);
        }
      }
    }    
    return resultadoFeatures;
  }
  runTraslapeTipoActividad(features: any) {
    if (!features || features?.length == 0) {
      return [];
    }

    const resultadoFeatures = [];
    //calcular porcentaje de cruce
    for (const feature of features) {
      if (feature.getAttribute("id_tp_actividad") && feature.getAttribute("id_tp_actividad") === Number(this.idTipoActividad)) {
        resultadoFeatures.push(feature);
      }
    }

    return resultadoFeatures;
  }

  extraerValoresSolicitud() {
    try {
      const objetoNegocio = typeof (this.solicitud.objeto_negocio) === "string" ? JSON.parse(this.solicitud.objeto_negocio) : this.solicitud.objeto_negocio;
      const nombreActividad = tiposActividadDataJson.find(item => item && item.id?.toString() === this.idTipoActividad )?.nombre || null;
      const nombreTipoIniciativa = tiposIniciativaDataJson.find(item => item && item.id?.toString() === objetoNegocio.tipo_iniciativa?.toString()  )?.nombre || objetoNegocio.tipo_iniciativa || null;
      const idTipoIniciativa = tiposIniciativaDataJson.find(item => item && item.nombre?.toString() === objetoNegocio.tipo_iniciativa?.toString()  )?.id || null;

      return {
        id_tp_inic_mitg: idTipoIniciativa || objetoNegocio.tipo_iniciativa || '',
        tp_inic_mitg: nombreTipoIniciativa || '',
        nom_inic_mitg: objetoNegocio.nombre_iniciativa || '',
        id_identific: objetoNegocio.participantes ? JSON.parse(objetoNegocio.participantes)[0]?.numero_identificacion || '' : '',
        nom_titular: objetoNegocio.participantes ? JSON.parse(objetoNegocio.participantes)[0]?.razon || '' : '',
        id_tp_actividad: this.idTipoActividad,
        tp_actividad: nombreActividad || null,
        fec_inio_activ: new Date(this.fechaInicialActividad).getTime() || null,
        fec_fin_activ: new Date(this.fechaFinalActividad).getTime() || null,
        fase: "Factibilidad",
        id_fase: 1,
        area_mt2: null,
        area_ha: null,
        estado_traslape: null,
        fec_trasl_polig: null,
        creado_por: this.solicitud?.usuario || "",
        creado: new Date(this.solicitud?.fecha_creacion).getTime(),
        modificado_por: this.solicitud?.usuario || "",
        modificado: new Date(this.solicitud?.fecha_creacion).getTime(),
        id_inic_sistema: this.solicitud._id || '',
        estado: "NO ACTIVO",
        estado_gestion: "Borrador",
        id_estado_gestn: 1
      };

    }
    catch (error) {
      throw `Error : ${error}}`
    }

  }
  private getFormatDate(fecha: string): string {
    // Formatear una fecha en formato 'YYYY-MM-DD'
    const formatDate = (date: string | number | Date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0"); // Los meses son 0 indexados
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    return formatDate(fecha);
  }

  calcularPorcentajeInterseccion(featureGeometry: __esri.Geometry | __esri.Geometry[], feature: { geometry: __esri.Geometry; }): { porcentaje: number; area: number } {
    let porcentaje = 0, area = 0;
    const intersectedGeometry = geometryEngine.intersect(featureGeometry, feature.geometry);
    if (intersectedGeometry) {
      if (intersectedGeometry && intersectedGeometry instanceof Polygon) {
        const polygon = feature.geometry as Polygon;
        const areaIntersection = geometryEngine.geodesicArea(intersectedGeometry, "square-meters");
        let areaTotal = geometryEngine.geodesicArea(polygon, "square-meters");
        if (isNaN(areaTotal)) {
          //@ts-ignore
          areaTotal = feature.getAttribute("area_ha_total_geografica") * 10000 || 0; // Si el área total es NaN, se usa el área total geográfica
        } 
        porcentaje = (areaIntersection / areaTotal) * 100;
        porcentaje = parseFloat(porcentaje.toFixed(2));
        area = parseFloat(areaTotal.toFixed(3));
        return { porcentaje, area };
      }
    }
    return { porcentaje, area };
  }

  ngOnDestroy() {
    if (this.geoJSONLayer) {
      this.sharedMapService?.view?.map.layers.remove(this.geoJSONLayer);
    }

    this.removeMapLayers([]);
  }

  removeZFromGeometry = (geometry: any): any => {
    if (geometry.hasZ) {
      geometry.hasZ = false;
    }
    if (geometry.z !== undefined) {
      delete geometry.z;
    }
    if (geometry.paths) {
      geometry.paths = geometry.paths.map((path: (string | any[])[]) =>
        path.map((coord: string | any[]) => coord.slice(0, 2)) // elimina la coordenada Z
      );
    }
    if (geometry.rings) {
      geometry.rings = geometry.rings.map((ring: any[]) =>
        ring.map(coord => coord.slice(0, 2)) // elimina la coordenada Z
      );
    }
    return geometry;
  };

}
