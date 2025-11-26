import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { SharedMapService } from 'src/app/services/shared-map.service';
import { environment } from 'src/environments/environment';
import * as geoprocessor from '@arcgis/core/rest/geoprocessor';

import JSZip from 'jszip';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import { ConfigService } from 'src/app/services/config.service';
import FeatureFilter from '@arcgis/core/layers/support/FeatureFilter';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import FeatureTable from '@arcgis/core/widgets/FeatureTable';
import { Chart, ChartData, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'deforestacion-conservar-paga',
  templateUrl: './deforestacion-conservar-paga.component.html',
  styleUrls: ['./deforestacion-conservar-paga.component.scss']
})
export class DeforestacionConservarPagaComponent implements OnDestroy {

  @ViewChild('featureTableNode', { static: true })
  private featureTableEl!: ElementRef;

  @ViewChild('chartCanvas', { static: true })
  private chartRef!: ElementRef<HTMLCanvasElement>;



  gpUrl: string =
    `${environment.utilsUrl}/UploadTable/GPServer`;

  disabled: boolean = true;
  mes = '';
  idPredio = "";
  loading: boolean = false;

  showModal = false;

  token = '';
  idCargue = '';

  fileUploadRaster: File | undefined;
  fileUploadMonitoreo: File | undefined;

  deforestacionTableUrl = '';
  deforestacionTable: FeatureLayer | any;
  featureTable!: FeatureTable;
  results: any = [];

  private chart!: Chart;


  constructor(private sharedMapService: SharedMapService, private configService: ConfigService,) {
    this.sharedMapService.loadMapImageLayerComplete$.subscribe((param: any) => {
      if (param === 'TRUE') {
        this.loadAttributes();
        this.initializeConfig();
        this.initTable();
      }
    });
  }


  ngOnDestroy(): void {
    // Muy importante destruir la instancia para liberar memoria
    if (this.chart) {
      this.chart.destroy();
    }
  }

  initTable() {

    this.featureTable = new FeatureTable({
      view: this.sharedMapService.view,
      container: this.featureTableEl.nativeElement,
      /* menuConfig: {
        //@ts-ignore
        items: ['zoom-to-selection', 'refresh-data']
      }, */
    });
  }

  private initializeConfig() {
    this.configService.config$.subscribe(async (config) => {
      if (config) {
        this.deforestacionTableUrl = config.topics.CONSERVAR_PAGA.mapType.layersUrl.find((l: any) => l.id == "PREDIO_DEFORESTACION").url;

        this.deforestacionTable = new FeatureLayer({
          url: this.deforestacionTableUrl
        })
        await this.deforestacionTable.load();
      } else {
        console.error('Config data is not loaded yet');
      }
    });
  }

  loadAttributes() {
    this.sharedMapService.attributes$.subscribe((attributes) => {

      this.token = attributes['token'];
      this.idCargue = attributes['id-cargue'];
    });
  }

  onChangeIdPredio(event: any): void {

    this.idPredio = event.target.value;
  }

  onMesChange(event: any): void {

    this.mes = event.target.value;
    this.validateForm();
  }


  triggerFileInputMonitoreo(): void {
    const fileInput = document.getElementById('fileInputMonitoreo');

    if (fileInput) {
      fileInput.click();
    }


  }

  triggerFileInputRaster(): void {
    const fileInput = document.getElementById('fileInputRaster');

    if (fileInput) {
      fileInput.click();
    }


  }


  async onFileSelectedMonitoreo(event: any) {

    if (!this.mes) {
      this.sharedMapService.showErrorAlert('No hay un mes seleccionado');
      return;
    }

    const input = event.target;
    const file: File | undefined = input.files?.[0];
    this.fileUploadMonitoreo = file;
    if (!file) {
      this.sharedMapService.showErrorAlert('Debe seleccionar un archivo.');
      return;
    }

    // 7. Validar extensión .zip
    if (!file.name.toLowerCase().endsWith('.zip')) {
      this.sharedMapService.showErrorAlert('El archivo debe tener extensión .zip.');
      return;
    }

    // 8. Validar nombre del archivo (ej: MI-20250125)
    const regexNombre = /^[A-Z]{2}-\d{8}$/;
    const nombreSinExt = file.name.replace('.zip', '').replace('.gdb', '');

    if (!regexNombre.test(nombreSinExt)) {
      this.sharedMapService.showErrorAlert('El nombre del archivo no cumple con el formato: XX-aaaammdd');
      return;
    }

    this.validateGBD();
    this.validateForm();
    input.value = null;
  }

  onFileSelectedRaster(event: any) {
    const input = event.target;
    const file: File | undefined = input.files[0];
    this.fileUploadRaster = file;



    this.validateForm();

    input.value = null;
  }

  private validateForm(): void {
    this.disabled = !(
      this.mes &&
      this.fileUploadRaster &&
      this.fileUploadMonitoreo
    );
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

    const geometryLayer = this.sharedMapService.view.map.allLayers.find((l: any) => `${l.id}`.includes('AREAS_PRIORIZADAS'));
    const popupTemplate = (geometryLayer as FeatureLayer).popupTemplate;


    try {

      const query = {
        returnGeometry: true,
        where: `id_predio = '${this.idPredio}'`,
        outFields: ['*'],
      };

      const geometryData = await (geometryLayer as FeatureLayer).queryFeatures(query);
      const data = await (this.deforestacionTable as FeatureLayer).queryFeatures(query);


      if ((geometryData.features.length == 0) && (data.features.length == 0)) {
        this.sharedMapService.showErrorAlert("No se ha encontrado este predio.")
        return;
      }

      if (geometryData.features.length > 0) {
        const geometries = geometryData.features.map((feature) => feature.geometry);

        geometryData.features.forEach((feat: any) => {
          const graphic = new Graphic({
            geometry: feat.geometry,
            symbol: fillSymbol,
          });
          this.sharedMapService.graphicsLayer.add(graphic);

          feat.popupTemplate = popupTemplate;
        });


        this.sharedMapService.view.goTo(geometries).catch((error) => {
          this.sharedMapService.showWarningAlert(
            `Error al ir a la geometría: <br> ${error}`
          );
        });



      } else {
        this.sharedMapService.showErrorAlert('No se encontraron geometrias para este predio.')
      }

      if (data.features.length > 0) {
        this.results = data;
        await this.createTable(this.results);
        await this.createChart();
      } else {
        this.sharedMapService.showErrorAlert('No se encontró informacion de deforestacion para este predio')
      }


    } catch (error) {
      console.log(error);
      this.sharedMapService.showErrorAlert("Ha ocurrido un error consultando.")
    } finally {
      this.loading = false;
    }

  }

  featuresToChartDataOld(
    features: __esri.Graphic[] | __esri.FeatureSet['features'],
    labelField: string,
    valueField: string,
    datasetLabel = 'Datos'
  ): ChartData {



    const labels = features.map(f => f.attributes[labelField]);
    const data = features.map(f => f.attributes[valueField]);

    return {
      labels,
      datasets: [
        {
          label: datasetLabel,
          data,
          backgroundColor: [
            '#36a2eb',
            '#ff6384',
            '#ffcd56',
            '#4bc0c0',
            '#9966ff',
            '#ff9f40'
          ]
        }
      ],
    };
  }

  mapFeaturesToChartData(features: any[]): { labels: string[], data: number[] } {
    const mesesOrden = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const mesesPresentes = Array.from(
      new Set(features.map(f => f.attributes.mes?.toLowerCase()).filter(Boolean))
    );

    const mesesOrdenados = mesesOrden.filter(m => mesesPresentes.includes(m));

    const valoresPorMes = mesesOrdenados.map(mes => {
      const feature = features.find(f => f.attributes.mes?.toLowerCase() === mes);
      return feature ? Number(feature.attributes.def_mes) || 0 : 0;
    });

    const labels = mesesOrdenados.map(m => m.charAt(0).toUpperCase() + m.slice(1));

    return { labels, data: valoresPorMes };
  }

  async createChart() {

    //const chartData = this.featuresToChartData(this.results.features, 'mes', 'def_mes', 'Deforestacion');
    const { labels, data } = this.mapFeaturesToChartData(this.results.features);
    const chartData = {
      labels: labels,
      datasets: [
        {
          label: `Meses`,
          data: data,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
        },
      ],
    }
    /* const labels: any[] = ["hola", "holaa", "holaa"];
    const data: any[] = [1, 2, 3];

    const testData = {
      labels: labels,
      datasets: [
        {
          label: `Meses`,
          data: data,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          // fill: false,
        },
      ],
    } */

    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            min: 0,
            max: 100,
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Porcentaje de deforestación por mes',
            font: { size: 18 }
          },
          datalabels: {
            color: '#000',
            anchor: 'end',      // puede ser 'center', 'start', 'end'
            align: 'top',       // 'top' = encima de la barra
            font: { weight: 'bold' },
          },
          legend: {
            display: false
          }
        }
      },
      plugins: [ChartDataLabels] //

    });

  }

  async createTable(results: any) {

    this.featureTable.layer = new FeatureLayer({
      source: results.features.map(
        (result: any) =>
          new Graphic({
            //geometry: result.geometry,
            attributes: result.attributes,
          })
      ),
      title: this.deforestacionTable.title,
      fields: results.fields,
      objectIdField: 'objectid',
    });
  }

  showInfoModal() {
    this.showModal = true;
  }


  validateGBD() {

    this.addFile(this.fileUploadMonitoreo!)
  }


  uploadFile(file: File): Promise<string> {
    const url = `${environment.utilsUrl}/UploadTable/GPServer/uploads/upload`;

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


  addFile(file: File): void {
    this.uploadFile(file)
      .then((itemID: string) => {
        const fileNameWithoutExtension: string = file.name.replace(
          /\.[^/.]+$/,
          ''
        );
        this.executeJobForGDB(itemID, fileNameWithoutExtension);
      })
      .catch((error) => {
        this.loading = false;
        console.error(
          'Error al subir el archivo o al obtener el itemID:',
          error
        );
      });
  }

  executeJobForGDB(itemID: string, fileNameWithoutExtension: string): void {
    const url = `${this.gpUrl}/UploadTable`;

    const params = {
      zip_file: `{'itemID':'${itemID}'}`,
      //"ZIP File": this.fileUploadMonitoreo
    };

    this.loading = true;
    geoprocessor
      .submitJob(url, params)
      .then((jobInfo) => {

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
                this.loading = false;

                this.validateGeometries(data.value.features)


              }).catch((error) => {
                console.error('Error al obtener datos:', error);
                this.sharedMapService.showErrorAlert(`Error al obtener datos: <br> ${error.message}`)
                this.loading = false;
              });
          }).catch((error) => {
            console.log('Error al completar el trabajo:', error);
            console.log(
              'Messages',
              error.messages.map((m: any) => [m.description, m.type])
            );
            this.loading = false;
          });;

      }).catch((error) => {
        console.log(error);
        this.loading = false;
      }).finally(() => {
        this.loading = false;
      });


    const progTest = (value: any) => {
      console.log(value.jobStatus);

      if (value.jobStatus == 'job-executing') {
        this.loading = true;
      }
    };

  }


  validateGeometries(features: __esri.Graphic[]) {

    console.log(features);


    if (!features || features.length === 0) {
      this.sharedMapService.showErrorAlert("No hay registros para validar.");
      return;
    }


    const [anoEsperadoStr, mesEsperadoStr] = this.mes.split("-");
    const anoEsperado = Number(anoEsperadoStr);
    const mesEsperadoNum = Number(mesEsperadoStr);

    // Mapa para convertir nombre → número
    const meses: any = {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12,
    };

    const idPredios = new Set();
    let firstAno = null;
    let firstMesNum = null;
    const prediosConFaltantes = [];

    for (const [index, f] of features.entries()) {
      const attrs = f.attributes || {};

      // --- Validar campos vacíos ---
      for (const [key, value] of Object.entries(attrs)) {
        if (
          !key.toUpperCase().includes("OBSV") && // excepción OBSV
          (value === null ||
            value === undefined ||
            value === "" ||
            (typeof value === "string" && value.trim() === ""))
        ) {
          prediosConFaltantes.push(attrs["ID_PREDIO"]);
          /* this.sharedMapService.showErrorAlert(
            `El campo "${key}" está vacío en el registro ${index + 1}`
          );
          return; */
        }
      }
    }

    console.log(prediosConFaltantes);
    const prediosConFaltantesUnique = new Set(prediosConFaltantes.filter(p => p));
    console.log(prediosConFaltantesUnique);
    if (prediosConFaltantesUnique.size > 0) {

      this.sharedMapService.showErrorAlert(
        `Los predios: ${[...prediosConFaltantesUnique]} tienen información sin diligenciar.`
      );
      return;
    }

    for (const [index, f] of features.entries()) {
      const attrs = f.attributes || {};

      // --- Validar ID_PREDIO no repetido ---
      const idPredio = attrs["ID_PREDIO"];
      if (!idPredio) {
        this.sharedMapService.showErrorAlert(
          `Falta el campo ID_PREDIO en el registro ${index + 1}`
        );
        return;
      }

      if (idPredios.has(idPredio)) {
        this.sharedMapService.showErrorAlert(
          `El ID_PREDIO "${idPredio}" está repetido.`
        );
        return;
      }
      idPredios.add(idPredio);
      // --- Validar año y mes coherentes ---
      const ano = Number(attrs["ANO"]);
      const mesAttr = attrs["MES"];
      const mesNum = isNaN(Number(mesAttr))
        ? meses[mesAttr.toLowerCase()] // si viene como "enero"
        : Number(mesAttr); // si viene como número

      if (!ano || !mesNum) {
        this.sharedMapService.showErrorAlert(
          `El registro con ID de predio ${idPredio} no tiene un AÑO o MES válido.`
        );
        return;
      }

      if (firstAno === null) {
        firstAno = ano;
        firstMesNum = mesNum;
      } else if (ano !== firstAno || mesNum !== firstMesNum) {
        this.sharedMapService.showErrorAlert(
          `El registro ID de predio ${idPredio} tiene un año o mes diferente a los anteriores.`
        );
        return;
      }
    }

    // --- Validar que coincida con mesEsperado (2025-01) ---
    if (firstAno !== anoEsperado || firstMesNum !== mesEsperadoNum) {
      this.sharedMapService.showErrorAlert(
        `Los datos pertenecen a ${firstAno}-${String(firstMesNum).padStart(2, "0")} pero se esperaba ${this.mes}.`
      );
      return;
    }

    this.sharedMapService.showSuccessAlert("Validaciones completadas correctamente");


  }

  guardar() {
    const url = `${environment.apiUrl}api/actualizar_archivo_poligono_ideam/${this.idCargue}/`;

    const form = new FormData();
    form.append("file1", this.fileUploadRaster!);
    form.append("file2", this.fileUploadMonitoreo!);
    form.append("estado", "MONITOREADO_IDEAM");


    const options = {
      method: 'PUT',
      body: form,
      headers: {
        Authorization: `Bearer ${this.token}`,
      }

    };

    //options.body = form;

    fetch(url, options)
      .then(response => response.json())
      .then(response => {

        this.fileUploadRaster = undefined;
        this.fileUploadMonitoreo = undefined;
        this.mes = '';

        this.sharedMapService.showSuccessAlert(`${response.message}`)

      })
      .catch(err => console.error(err));

  }

  clearSearch() {
    this.idPredio = '';
    this.results = [];
    this.sharedMapService.graphicsLayer.removeAll();
  }

}
