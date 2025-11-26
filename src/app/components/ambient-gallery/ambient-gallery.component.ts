import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';

import { SharedMapService } from '../../services/shared-map.service';
import { HttpClient } from '@angular/common/http';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import Query from '@arcgis/core/rest/support/Query';
import MapView from '@arcgis/core/views/MapView';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'ambient-gallery-component',
  templateUrl: './ambient-gallery.component.html',
  styleUrls: ['./ambient-gallery.component.scss'],
})
export class AmbientGalleryComponent
  implements AfterViewInit, OnDestroy, AfterViewChecked {
  private buscadorSubject = new Subject<string>(); // Sujeto para el debounce

  loading: boolean = false;

  mapServices: any[] = [];
  results: any[] = [];
  keyValue: string = '';

  onResult = false;

  finalLayers: any[] = [];

  tablesUrl: string[] = [];
  tableService: any;

  areaLayer: any;
  areaList: any;



  filteredLayers: any = [];

  constructor(
    private mapService: SharedMapService,
    private configService: ConfigService,
    private http: HttpClient,
    private el: ElementRef
  ) {
    this.buscadorSubject.pipe(debounceTime(300)).subscribe((texto) => {
      this.filtrarLayers(texto);
    });
  }

  ngAfterViewChecked() {

  }

  ngAfterViewInit() {
    this.initializeConfig();
  }

  onBuscar(texto: any) {
    this.buscadorSubject.next(texto);
  }

  private initializeConfig() {
    this.configService.config$.subscribe(async (config) => {
      console.log('config', config);

      if (config) {
        console.log(config);
        this.tablesUrl = config.topics.AMBIENTE.tables;
        const urlArea = config.topics.AMBIENTE.areaLayer;

        if (urlArea) {
          try {
            this.areaLayer = new FeatureLayer({
              url: urlArea,
              outFields: ['*'],
            });

            await this.areaLayer.load();

            await this.loadArea(this.areaLayer);

            if (this.tablesUrl) {
              this.finalLayers = [];
              for (const url of this.tablesUrl) {
                try {
                  console.log('url', url);

                  this.tableService = new FeatureLayer({
                    url: url,
                    outFields: ['*'],

                  });

                  await this.tableService.load();

                  await this.loadServices(this.tableService);
                } catch (error) {
                  console.error(`❌ Error cargando la capa ${url}:`, error);
                  this.mapService.showWarningAlert(
                    `El servicio "${url.split('/').splice(6, 2).join("/")}" no se pudo cargar correctamente.`
                  );
                  //this.mapService.showErrorAlert("Las tablas de servicios no se encuentran disponibles. Intente cargar nuevamente o consulte con el administrador del sistema.");
                }
              }


            }
          } catch (error) {
            console.error(error);
            this.mapService.showErrorAlert("La capa de servicios no se encuentra disponible. Intente cargar nuevamente o consulte con el administrador del sistema.");
          }

        } else {
          console.error('Config data is not loaded yet');
        }
      }
    });
  }

  async loadArea(areaL: FeatureLayer) {
    const where = new Query({
      where: '1=1',
      outFields: ['*'],
      returnGeometry: false,
      orderByFields: ['nombre'],
    });
    try {
      const results = await areaL.queryFeatures(where);

      this.areaList = results.features;

      console.log('AREAAA PAI', results, this.areaList);

    } catch (error) {
      console.error(error);
    }
  }

  async loadServices(table: FeatureLayer) {
    const where = new Query({
      where: '1=1',
      outFields: ['*'],
      returnGeometry: false,
      orderByFields: ['nombre'],
    });
    try {
      let results: __esri.FeatureSet = await table.queryFeatures(where);

      const features = results.features.map((ft: any) => ({
        attributes: ft.attributes,
        area: this.areaList.find(
          (ar: any) => ar.attributes.objectid == ft.attributes.id_area
        ),
      }));

      this.finalLayers = [...this.finalLayers, ...features];
      this.filteredLayers = [...this.finalLayers];

    } catch (error) {
      console.error(error);
    }
  }



  filtrarLayers(texto: any) {
    if (!texto) {
      this.filteredLayers = [...this.finalLayers];
      return;
    }

    const textoLower = texto.toLowerCase();
    this.filteredLayers = this.finalLayers.filter((layer) =>
      layer.area?.attributes.nombre.toLowerCase().includes(textoLower) ||
      layer.area?.attributes.descripcion.toLowerCase().includes(textoLower) ||
      layer.attributes.nombre.toLowerCase().includes(textoLower) ||
      layer.attributes.descripcion.toLowerCase().includes(textoLower)
    );
  }


  verDetalles(card: any) {
    console.log(card);
    this.onResult = true;

    const flow = this.el.nativeElement.querySelector('calcite-flow');

    const newItem = document.createElement('calcite-flow-item');
    newItem.setAttribute('heading', card.attributes.nombre);
    newItem.innerHTML = `<p>${card.attributes.descripcion}</p>`;
    newItem.addEventListener('calciteFlowItemBack', () => {
      newItem.remove();
      this.onResult = false;
    });
    flow.appendChild(newItem);

    const footerDiv = document.createElement('div');
    footerDiv.style.display = 'flex';
    footerDiv.style.flexDirection = 'column';
    footerDiv.style.width = '100%';
    footerDiv.slot = 'footer';
    footerDiv.style.gap = '8px'; // Espacio entre botones

    const button = document.createElement('calcite-button');
    button.width = 'full';
    button.loading = this.loading;
    button.innerText = 'Agregar al Mapa';

    const button2 = document.createElement('calcite-button');
    button2.width = 'full';
    button2.appearance = 'outline-fill';
    button2.innerText = 'Metadatos';

    const button3 = document.createElement('calcite-button');
    button3.width = 'full';
    button3.appearance = 'transparent';
    button3.innerText = 'Datos abiertos';

    // Agregar botones al div
    footerDiv.appendChild(button);
    footerDiv.appendChild(button2);
    footerDiv.appendChild(button3);

    // Agregar el div al newItem
    newItem.appendChild(footerDiv);

    // Evento del primer botón
    button.addEventListener('click', (e: Event) => {
      this.addLayerToView(
        this.mapService.view,
        card.attributes.url_servicio,
        button
      );
    });

    button2.addEventListener('click', () => {
      window.open(card.attributes.url_metadato, '_blank');
    });
    button3.addEventListener('click', () => {
      window.open(card.attributes.url_dato_abierto, '_blank');
    });
  }

  async addLayerToView(view: MapView, layerUrl: string, button: any) {
    this.loading = true;
    button.loading = true;
    button.disabled = true;
    const layer = new FeatureLayer({
      url: layerUrl, // Reemplázala con la URL de tu servicio
    });

    await layer.load();

    const existingLayer = view.map.layers.find(
      (layerW) => layerW.title === layer.title
    );

    if (existingLayer) {
      this.loading = false;
      button.loading = false;
      button.disabled = false;
      this.mapService.showWarningAlert('Capa no añadida. Ya existe.');
      return;
    }

    view.map.add(layer); // Agrega la capa al mapa
    this.loading = false;
    button.loading = false;
    button.disabled = false;

    console.log(layer.fullExtent);

    if (layer.fullExtent) {
      view
        .goTo(layer.fullExtent)
        .then(() => {
          this.mapService.showSuccessAlert('Capa añadida al mapa.');
        })
        .catch((err) => console.error('Error al acercar la vista:', err));
    } else {
      console.warn('La capa no tiene una extensión definida.');
    }
  }

  ngOnDestroy() { }
}
