import { Component, ElementRef, ViewChild } from '@angular/core';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import { SharedMapService } from '../../services/shared-map.service';
import * as query from '@arcgis/core/rest/query';
import Query from '@arcgis/core/rest/support/Query';
import Graphic from '@arcgis/core/Graphic';
import MapImageLayer from '@arcgis/core/layers/MapImageLayer';
import Chart from 'chart.js/auto';
import Expand from '@arcgis/core/widgets/Expand';

@Component({
  selector: 'app-porh-filters',
  templateUrl: './porh-filters.component.html',
  styleUrls: ['./porh-filters.component.scss'],
})
export class PorhFiltersComponent {
  @ViewChild('container', { static: true }) container!: ElementRef;
  @ViewChild('controlTable') controlTable!: ElementRef;

  loading: boolean = false;

  layers: any[] = [];
  layer: any;
  porhs: any[] = [];
  porh: any;

  values: any[] = [];
  value: any;
  usos: any[] = [];
  uso: any;
  parametros: any[] = [];
  parametro: any;
  feature: any;
  count: number = 0;
  subTable: any = { id: -1 };

  tables: any[] = [];

  pointSymbol: any = {
    type: 'simple-marker',
    size: 6,
    color: 'rgb(226,119,40)',
  };
  polygonSymbol: any = {
    type: 'simple-fill',
    color: 'purple',
    style: 'backward-diagonal',
    outline: {
      color: 'purple',
      width: 3,
    },
  };
  polylineSymbol: any = {
    type: 'simple-line',
    size: 4,
    width: 4,
    color: 'rgb(226,119,40)',
  };

  results: any;
  tableStatus: boolean = false;

  expand: Expand | any;

  constructor(private sharedMapService: SharedMapService) {
    this.sharedMapService.loadMapImageLayerComplete$.subscribe((param: any) => {
      if (param === 'TRUE') {
        this.loadLayers();
      }
    });
  }

  clearAll(button: boolean) {
    this.values = [];
    this.value = undefined;
    this.usos = [];
    this.uso = undefined;
    this.parametros = [];
    this.parametro = undefined;
    this.toggleFeatureTable(false);
    this.sharedMapService.graphicsLayer.removeAll();
    this.results = undefined;
    this.count = 0;
    this.subTable = { id: -1 };
    this.controlTable.nativeElement.value = '';
    if (button) {
      /* (this.spLayerComponent.nativeElement as HTMLCalciteSelectElement).value = ''; */
      const calciteSelects =
        this.container.nativeElement.querySelectorAll('calcite-select');

      // Asigna un valor vacío a cada uno de ellos
      calciteSelects.forEach((select: any) => {
        select.value = '';
      });
    }
  }

  onChangeService(event: Event) {
    this.clearAll(false);

    if ((event.target as HTMLInputElement).value) {
      this.layer = (event.target as HTMLInputElement).value;
      this.queryPorhs();
    }
  }

  onChangePorh(event: Event) {
    this.value = undefined;
    this.values = [];
    this.results = undefined;
    this.count = 0;
    this.porh = (event.target as HTMLInputElement).value;
    this.queryDistinctValues();
  }

  onChangeValue(event: Event) {
    this.sharedMapService.graphicsLayer.removeAll();
    this.results = undefined;
    this.count = 0;
    this.value = (event.target as HTMLInputElement).value;
    this.zoomToValue();
    if (this.subTable.id != -1) {
      this.queryUsos();
      if (this.subTable.id != 7) {
        this.queryParametros();
      }
    }
  }

  onChangeTable(event: Event) {
    this.results = undefined;
    this.count = 0;
    //@ts-ignore
    this.subTable = event.target.value;
    this.queryUsos();
    if (this.subTable.id != 7) {
      this.queryParametros();
    }
  }

  onChangeUso(event: Event) {
    this.uso = (event.target as HTMLInputElement).value;
  }
  onChangeParametro(event: Event) {
    this.parametro = (event.target as HTMLInputElement).value;
  }

  queryUsos() {
    try {
      this.loading = true;
      this.usos = [];
      let field: string;
      if (this.subTable.id == 7) {
        field = 'indice_calidad';
      } else if (this.subTable.id == 6) {
        field = 'uso';
      } else {
        field = 'uso_potencial';
      }

      const queryParamas = new Query({
        outFields: [`${field}`],
        returnGeometry: false,
        returnDistinctValues: true,
      });

      if (this.layer.title == 'Tramo') {
        if (this.subTable.id == 4) {
          queryParamas.where = `segmento = '${this.value.value}'`;
        } else {
          queryParamas.where = `tramo = '${this.value.value}'`;
        }
      } else {
        if (this.subTable.id == 4) {
          queryParamas.where = `punto_monitoreo = '${this.value.value}'`;
        } else {
          queryParamas.where = `punto = '${this.value.value}'`;
        }
      }

      query
        .executeQueryJSON((this.subTable as __esri.Sublayer).url, queryParamas)
        .then((results) => {
          for (const feature of results.features) {
            this.usos.push({
              label: feature.attributes[`${field}`],
              value: feature.attributes[`${field}`],
            });
          }
        })
        .catch((error) => {
          console.log(error);
          this.sharedMapService.showWarningAlert(
            `Ha ocurrido un error ${error.message}`
          );
        })
        .finally(() => (this.loading = false));
    } catch (error) {
      this.loading = false;
      this.controlTable.nativeElement.value = '';
      this.sharedMapService.showWarningAlert('Ha ocurrido un error inesperado. Intentalo más tarde');
      console.error('Error');
    }
  }

  queryParametros() {
   try {
    this.loading = true;
    this.parametros = [];
    const queryParamas = new Query({
      outFields: ['parametro'],
      returnGeometry: false,
      returnDistinctValues: true,
    });

    if (this.layer.title == 'Tramo') {
      if (this.subTable.id == 4) {
        queryParamas.where = `segmento = '${this.value.value}'`;
      } else {
        queryParamas.where = `tramo = '${this.value.value}'`;
      }
    } else {
      if (this.subTable.id == 4) {
        queryParamas.where = `punto_monitoreo = '${this.value.value}'`;
      } else {
        queryParamas.where = `punto = '${this.value.value}'`;
      }
    }

    query
      .executeQueryJSON((this.subTable as __esri.Sublayer).url, queryParamas)
      .then((results) => {
        for (const feature of results.features) {
          this.parametros.push({
            label: feature.attributes['parametro'],
            value: feature.attributes['parametro'],
          });
        }
        this.loading = false;
      })
      .catch((error) => {
        console.log(error);
        this.sharedMapService.showWarningAlert(
          `Ha ocurrido un error ${error.message}`
        );
      })
      .finally(() => (this.loading = false));
   } catch (error) {
     this.loading = false;
     this.controlTable.nativeElement.value = '';
     this.sharedMapService.showWarningAlert('Ha ocurrido un error inesperado. Intentalo más tarde');
     console.error('Error' );
   }
  }

  queryDistinctValues(): void {
    this.loading = true;
    this.values = [];

    const fieldd = this.layer.title == 'Tramo' ? 'nom_tramo' : 'nom_punto';
    const queryParamas = new Query({
      outFields: [fieldd],
      returnGeometry: false,
      where: `nom_ca='${this.porh.label}'`,
      returnDistinctValues: true,
    });

    query
      .executeQueryJSON(this.layer.url, queryParamas)
      .then((results) => {
        for (const feature of results.features) {
          this.values.push({
            label: feature.attributes[fieldd],
            value: feature.attributes[fieldd],
          });
        }
        this.loading = false;
      })
      .catch((err) => {
        this.loading = false;
        console.error(err);
      });
  }

  queryPorhs() {
    this.loading = true;
    this.porhs = [];

    const queryParamas = new Query({
      outFields: ['nom_ca'],
      returnGeometry: false,
      where: '1=1',
      returnDistinctValues: true,
    });

    query
      .executeQueryJSON(this.layer.url, queryParamas)
      .then((results) => {
        for (const feature of results.features) {
          this.porhs.push({
            label: feature.attributes['nom_ca'],
            value: feature.attributes['nom_ca'],
          });
        }
        this.loading = false;
      })
      .catch((err) => {
        this.loading = false;
        console.error(err);
      });
  }
  zoomToValue() {
    this.loading = true;
    const fieldd = this.layer.title == 'Tramo' ? 'nom_tramo' : 'nom_punto';

    const queryParamas = new Query({
      outFields: [fieldd],
      returnGeometry: true,
      where: `${fieldd} = '${this.value.value}'`,
      outSpatialReference: this.sharedMapService.view.spatialReference,
    });
    query
      .executeQueryJSON(this.layer.url, queryParamas)
      .then((results) => {
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
          const featureGeometry =
            this.sharedMapService.graphicsLayer.graphics.getItemAt(0).geometry;

          this.sharedMapService.view.goTo(
            this.feature.geometry.type === 'point'
              ? featureGeometry
              : featureGeometry.extent.expand(1.5)
          );
        }
        this.loading = false;
      })
      .catch((err) => {
        this.loading = false;
        console.error(err);
      });
  }

  searchItems() {
    this.loading = true;

    const queryParamas = new Query({
      outFields: ['*'],
      returnGeometry: true,
    });

    if (this.layer.title == 'Tramo') {
      if (this.subTable.id == 4) {
        queryParamas.where = `segmento = '${this.value.value}'`;
      } else {
        queryParamas.where = `tramo = '${this.value.value}'`;
      }
    } else {
      if (this.subTable.id == 4) {
        queryParamas.where = `punto_monitoreo = '${this.value.value}'`;
      } else {
        queryParamas.where = `punto = '${this.value.value}'`;
      }
    }

    if (this.uso) {
      if (this.subTable.id == 4) {
        queryParamas.where =
          queryParamas.where + ` and uso_potencial = '${this.uso.value}' `;
      } else if (this.subTable.id == 6) {
        queryParamas.where =
          queryParamas.where + ` and uso = '${this.uso.value}' `;
      } else {
        queryParamas.where =
          queryParamas.where + ` and indice_calidad = '${this.uso.value}' `;
      }
    }

    if (this.parametro && this.subTable.id != 7) {
      queryParamas.where =
        queryParamas.where + ` and parametro = '${this.parametro.value}' `;
    }

    query
      .executeQueryJSON((this.subTable as __esri.Sublayer).url, queryParamas)
      .then((results) => {
        if (results.features.length > 0) {
          this.results = results;
          this.count = results.features.length;
          this.tableStatus = false;
          this.toggleFeatureTable(this.tableStatus);
        } else {
          this.sharedMapService.showWarningAlert(
            'No se ha podido encontrar alguna medición.'
          );
        }
        this.loading = false;
      })
      .catch((error) => {
        this.loading = false;
        console.log(error);
        this.sharedMapService.showWarningAlert(
          `Ha ocurrido un error ${error.message}`
        );
      })
      .finally(() => (this.loading = false));
  }

  loadLayers(): void {
    this.layers = [];
    this.loading = true;
    const webmap: __esri.WebMap = this.sharedMapService.view
      ?.map as __esri.WebMap;

    if (webmap) {
      webmap
        .loadAll()
        .then(async () => {
          const layerPORH = webmap.allLayers
            .toArray()
            .filter((l) => l.title == 'PORH')[0] as MapImageLayer;
          this.tables = layerPORH.subtables.toArray();

          this.layers = layerPORH.allSublayers.toArray();

          this.loading = false;
        })
        .catch((error: any) => {
          console.log('Error loading webmap:', error);
          this.loading = false;
        })
        .finally(() => (this.loading = false));
    }
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

  async showChart() {
    const chartContainer = document.createElement('div');
    chartContainer.style.width = '550px';
    chartContainer.style.height = '350px';
    chartContainer.style.display = 'flex';
    chartContainer.style.flexDirection = 'column';
    chartContainer.style.overflow = 'auto';
    chartContainer.style.overflowX = 'hidden';
    chartContainer.style.overflowY = 'scroll';
    chartContainer.style.maxHeight = '350px';
    chartContainer.style.boxSizing = 'border-box';

    //document.body.appendChild(chartContainer);
    const resultCases = {};
    this.results.features.forEach((val: any) => {
      let item;
      if (this.subTable.id == 7) {
        item = `${val.attributes.indice_calidad}`;
      } else {
        item = `${val.attributes.parametro}`;
      }
      //@ts-ignore
      if (resultCases[item]) {
        //@ts-ignore
        resultCases[item] = [...resultCases[item], val];
      } else {
        //@ts-ignore
        resultCases[item] = [val];
      }
    });

    Object.keys(resultCases).forEach((val: any) => {
      const chartCanvas = document.createElement('canvas');
      chartContainer.appendChild(chartCanvas);
      const labels: any[] = [];
      const data: any[] = [];

      //@ts-ignore
      resultCases[`${val}`].forEach((val: any) => {
        let fecha;
        if (this.subTable.id == 4) {
          fecha = new Date(val.attributes.fecha_medicion);
        } else {
          fecha = new Date(val.attributes.fecha);
        }
        labels.push(fecha.toDateString());
        data.push(val.attributes.valor_medido);
      });

      const myChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: `${val}`,
              data: data,
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    });

    if (this.expand) {
      this.expand.destroy();
      this.sharedMapService.view.ui.remove(this.expand);
    }

    this.expand = new Expand({
      content: chartContainer,
      view: this.sharedMapService.view,
      icon: 'esri-icon-chart',
      expanded: true,
    });

    this.sharedMapService.view.ui.add(this.expand, 'bottom-right');
  }
}
