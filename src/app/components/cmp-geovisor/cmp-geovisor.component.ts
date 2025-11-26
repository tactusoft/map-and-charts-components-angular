import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ConfigService } from '../../services/config.service';
import { SharedMapService } from '../../services/shared-map.service';
import { TokenService } from '../../services/token.service';
import { HttpClient } from '@angular/common/http';
import { LabelVisibilityChange } from '../../dto/label.visibility.change';
import esriId from '@arcgis/core/identity/IdentityManager';

import WebMap from '@arcgis/core/WebMap';
import MapView from '@arcgis/core/views/MapView';
import FeatureTable from '@arcgis/core/widgets/FeatureTable';

import Home from '@arcgis/core/widgets/Home';
import Search from '@arcgis/core/widgets/Search';
import ScaleBar from '@arcgis/core/widgets/ScaleBar';
import Zoom from '@arcgis/core/widgets/Zoom';
import Expand from '@arcgis/core/widgets/Expand';
import DistanceMeasurement2D from '@arcgis/core/widgets/DistanceMeasurement2D';
import AreaMeasurement2D from '@arcgis/core/widgets/AreaMeasurement2D';
import Handles from '@arcgis/core/core/Handles';
import * as promiseUtils from '@arcgis/core/core/promiseUtils';

import ImageryLayer from '@arcgis/core/layers/ImageryLayer';
import MapImageLayer from '@arcgis/core/layers/MapImageLayer';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer';
import WMSLayer from '@arcgis/core/layers/WMSLayer';
import WFSLayer from '@arcgis/core/layers/WFSLayer';
import PopupTemplate from '@arcgis/core/PopupTemplate';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Point from '@arcgis/core/geometry/Point';
import Graphic from '@arcgis/core/Graphic';
import * as query from '@arcgis/core/rest/query';
import Query from '@arcgis/core/rest/support/Query';
import FeatureFilter from '@arcgis/core/layers/support/FeatureFilter';
import { catchError, of, tap } from 'rxjs';
import {
  POMCALayerName,
  PORHLayerName,
  ProjectName,
} from '../sirh-validator/types/sirhValidator';

declare const configData: any;

@Component({
  selector: 'app-cmp-geovisor',
  standalone: true,
  templateUrl: './cmp-geovisor.component.html',
  styleUrls: ['./cmp-geovisor.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CmpGeovisorComponent implements OnInit, AfterViewInit, OnChanges {
  @ViewChild('mapViewNode', { static: true }) private mapViewEl!: ElementRef;
  @ViewChild('featureTableNode', { static: true })
  private featureTableEl!: ElementRef;

  @Input() center: string | undefined;
  @Input() zoom: string | undefined;
  @Input() year: string | undefined;
  @Input() topic: string | undefined;
  @Input() state: string | undefined;
  @Input() city: string | undefined;
  @Input() region: string | undefined;
  @Input() effect: string | undefined;
  @Input() ecoregion: string | undefined;
  @Input() layerNameToValidate: POMCALayerName | PORHLayerName = '' as any;
  @Input() projectName: ProjectName = '' as any;
  @Input() idSolicitud: string = '';
  @Input() idTipoActividad: string = '';
  @Input() fechaInicialActividad: string = '';
  @Input() fechaFinalActividad: string = '';
  @Input() tokenKeycloak: string = '';
  @Input() resultadoTraslape?: (datos?: object | undefined) => object | undefined;
  @Output() onValidationCompleted: EventEmitter<string[]> = new EventEmitter();
  @Output() onValidationProgress: EventEmitter<{ validationsCompleted: number, totalValidations: number }> = new EventEmitter();
  @Output() onFileSelected: EventEmitter<File> = new EventEmitter();
  @Output() public onNotification: EventEmitter<{
    severity: 'error' | 'success';
    summary: string;
    detail: string;
  }> = new EventEmitter();
  @Output() resultadoTraslapeChange = new EventEmitter<(datos?: object) => object | undefined>();

  config: any;
  settings: any;
  allWidgets: any[] = [];

  alertOpen: boolean = false;
  alertKind: string = '';
  alertMessage: string = '';

  private view!: MapView;
  private map!: WebMap;
  private homeWidget: any;
  private searchWidget: any;
  private zoomWidget: any;
  private scaleBarWidget: any;
  private bgExpand: any;

  private changeTopic: boolean = false;
  private featureTable!: FeatureTable;

  private areaMeasurement2D: any;
  private distanceMeasurement2D: any;

  private activeWidget: any;
  public mapReady = false;

  private configSubscription: any;
  private token: string = '';

  menuItems = {
    items: [
      {
        label: 'Descargar',
        icon: 'download',
        hidden: () => { },
        clickFunction: () => {
          this.downloadData();
        },
      },
      {
        label: 'Cerrar',
        icon: 'x',
        hidden: () => { },
        clickFunction: () => {
          this.sharedMapService.tableContainer.classList.add('hidden-table');
        },
      },
    ],
  };

  private configService = inject(ConfigService);
  private sharedMapService = inject(SharedMapService);
  public tokenService = inject(TokenService);

  constructor(
    private http: HttpClient,
    private elRef: ElementRef
  ) { }

  ngOnInit(): void {
    this.captureInitialAttributes();

    this.sharedMapService.successAlert$.subscribe((message: string) => {
      this.showSuccessAlert(message);
    });

    this.sharedMapService.warningAlert$.subscribe((message: string) => {
      this.showWarningAlert(message);
    });

    this.sharedMapService.errorAlert$.subscribe((message: string) => {
      this.showErrorAlert(message);
    });

    this.sharedMapService.showHideLabels$.subscribe(
      (change: LabelVisibilityChange) => {
        this.showHideLabels(change);
      }
    );
  }

  ngAfterViewInit(): void {
    this.initializeConfig();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.view) {
      for (const propName in changes) {
        if (changes.hasOwnProperty(propName)) {
          switch (propName) {
            case 'center':
              const center = this.parseCenterValue(
                changes[propName].currentValue
              );
              this.view.center = center;
              break;
            case 'zoom':
              this.view.zoom = changes[propName].currentValue;
              break;
            case 'year':
              this.year = changes[propName].currentValue;
              break;
            case 'topic':
              this.topic = changes[propName].currentValue;
              this.changeTopic = true;
              break;
            case 'state':
              this.sharedMapService.graphicsLayer.removeAll();
              this.state = changes[propName].currentValue;
              break;
            case 'city':
              this.sharedMapService.graphicsLayer.removeAll();
              this.city = changes[propName].currentValue;
              break;
            case 'region':
              this.sharedMapService.graphicsLayer.removeAll();
              this.region = changes[propName].currentValue;
              break;
            case 'effect':
              this.effect = changes[propName].currentValue;
              break;
            case 'ecoregion':
              this.sharedMapService.graphicsLayer.removeAll();
              this.ecoregion = changes[propName].currentValue;
              break;
            case 'token':
              this.token = changes[propName].currentValue;
              break;
            case 'layerNameToValidate':
              this.layerNameToValidate = changes[propName].currentValue;
              break;
            case 'projectName':
              this.projectName = changes[propName].currentValue;
              break;
            default:
              // Manejar otros casos de actualización de propiedades si es necesario
              break;
          }

          this.loadAttributes();
        }
      }
    }
  }

  loadAttributes() {
    const graphicsLayer = this.sharedMapService.graphicsLayer;
    const mapLayers = this.map.allLayers.toArray();

    for (let i = mapLayers.length - 1; i >= 0; i--) {
      const layer = mapLayers[i];
      if (layer !== graphicsLayer) {
        this.map.remove(layer);
      }
    }

    this.map.removeAll();

    const config = this.configService.configData;
    if (config && this.topic) {
      this.refreshMap(config);
    } else {
      console.error('Config data is not loaded or topic is not defined');
    }
  }

  refreshMap(data: any): void {
    this.loadConfigWidgets(data);
    if (this.config) {
      this.loadBaseMap();
      this.loadMap();
      this.sharedMapService.loadMapImageLayerComplete();
    }
  }

  private parseCenterValue(centerValue: string | undefined): Point {
    if (centerValue) {
      const [longitude, latitude] = centerValue
        .replace(/\[|\]/g, '')
        .split(',')
        .map(parseFloat);
      if (!isNaN(longitude) && !isNaN(latitude)) {
        return new Point({ longitude, latitude });
      }
    }
    return new Point({ longitude: -74, latitude: 4 });
  }

  handleActionBarClick(element: any): void {
    const target = element.currentTarget;

    if (this.activeWidget) {
      const nextWidgetActive: any = document.querySelector(
        `[data-action-id=${this.activeWidget}]`
      );
      if (nextWidgetActive) {
        nextWidgetActive.active = false;
      }
      const nextWidgetHide: any = document.querySelector(
        `[data-panel-id=${this.activeWidget}]`
      );
      if (nextWidgetHide) {
        nextWidgetHide.hidden = true;
      }
    }

    const nextWidget = target['data-action-id'];
    if (nextWidget !== this.activeWidget) {
      const nextWidgetActive: any = document.querySelector(
        `[data-action-id=${nextWidget}]`
      );
      if (nextWidgetActive) {
        nextWidgetActive.active = true;
      }
      const nextWidgetHide: any = document.querySelector(
        `[data-panel-id=${nextWidget}]`
      );
      if (nextWidgetHide) {
        nextWidgetHide.hidden = false;
      }
      this.activeWidget = nextWidget;
    } else {
      this.activeWidget = null;
    }
  }

  showAlert(alertKind: string, alertMessage: string) {
    this.alertOpen = false;
    setTimeout(() => {
      this.alertOpen = true;
      this.alertMessage = alertMessage;
      this.alertKind = alertKind;
    });
  }

  showSuccessAlert(alertMessage: string) {
    this.showAlert('success', alertMessage);
  }

  showWarningAlert(alertMessage: string) {
    this.showAlert('warning', alertMessage);
  }

  showErrorAlert(alertMessage: string) {
    this.showAlert('danger', alertMessage);
  }

  showHideLabels(change: LabelVisibilityChange) {
    const swipeLabelLeft = document.getElementById('swipeLabelLeft');
    const swipeLabelRight = document.getElementById('swipeLabelRight');

    if (swipeLabelLeft && swipeLabelRight) {
      swipeLabelLeft.innerText = change.messageLeft;
      swipeLabelRight.innerText = change.messageRight;

      swipeLabelLeft.style.display = change.show ? 'block' : 'none';
      swipeLabelRight.style.display = change.show ? 'block' : 'none';
    }
  }

  private initializeConfig() {
    this.configSubscription = this.configService.config$.subscribe((config: any) => {
      console.log('config', config);

      if (config) {
        this.handleConfigData(config);
      } else {
        console.error('Config data is not loaded yet');
      }
    });
  }

  loadConfig(): void {
    this.configService.config$.subscribe((config: any) => {
      if (config) {
        console.log('handleConfig');

        this.handleConfigData(config);
      } else {
        console.error('Config data is not loaded yet');
      }
    });
  }

  loadConfigWidgets(data: any): void {
    this.settings = data.settings;
    if (this.topic) {
      this.config = data.topics[this.topic];
      this.config.topic = this.topic;
      this.sharedMapService.config = this.config;
      this.sharedMapService.config.settings = data.settings;
      this.allWidgets = this.config.widgets;
      const actives = this.allWidgets.filter((widget) => widget.active);
      if (actives.length > 0) {
        this.activeWidget = actives[0].dataPanelId;
      }
    }
  }

  handleConfigData(data: any): void {
    this.loadConfigWidgets(data);
    this.loadConfigMap();
  }

  loadBaseMap(): void {
    let itemId: string = '4eb643e1b9d14793a1dc5e507b0f9a80';
    if (this.config && this.config.mapType.type === 'WEB_MAP') {
      itemId = this.config.mapType.itemId;
    }

    if (this.changeTopic) {
      this.loadView();
      this.changeTopic = false;
    }

    this.map = new WebMap({
      portalItem: {
        id: itemId,
      },
    });

    this.view.map = this.map;

    this.view.when(() => {
      this.loadWidgets();
    });

    this.map.when(() => {
      if (
        this.map.initialViewProperties &&
        this.map.initialViewProperties.viewpoint &&
        this.map.initialViewProperties.viewpoint.targetGeometry &&
        this.map.initialViewProperties.viewpoint.targetGeometry.type ===
        'extent'
      ) {
        this.view.extent = this.map.initialViewProperties.viewpoint
          .targetGeometry as any;
      }

      if (!this.sharedMapService.graphicsLayer) {
        this.sharedMapService.graphicsLayer = new GraphicsLayer({
          id: 'mads-graphicsLayer',
          title: 'Capa Temporal de Dibujo',
          listMode: 'hide',
        });
        this.map.add(this.sharedMapService.graphicsLayer);
      }

      this.loadSymbologies();
    });
  }

  loadView(): void {
    this.view = new MapView({
      container: this.mapViewEl.nativeElement,
      padding: {
        left: 49,
      },
      ui: {
        components: ['attribution'],
      },
    });
    this.sharedMapService.view = this.view;

    let tableContainerEl = document.getElementById(
      'tableContainer'
    ) as HTMLElement;
    const tableDiv = document.createElement('div');
    //Eliminar tabla ya existente
    tableContainerEl.innerHTML = '';
    tableContainerEl.appendChild(tableDiv);

    this.featureTable = new FeatureTable({
      view: this.view,
      container: tableDiv,
      //@ts-ignore
      menuConfig: this.menuItems,
    });

    this.sharedMapService.tableContainer = tableContainerEl;
    this.sharedMapService.featureTable = this.featureTable;

    this.configHighlightTable();
  }

  /** Metodo para resaltar la feature de la tabla en la capa y viceversa */
  addHighlight(feature: any, highlightHandles: any) {
    if (this.sharedMapService.featureTable.layerView && feature) {
      const layerView = this.sharedMapService.featureTable.layerView as any;
      highlightHandles.add(layerView.highlight(feature), feature.getObjectId());
    }
  }

  /** Configuraciones para resaltar features de la table en la layer */
  configHighlightTable() {
    // Manejador para los resaltados
    const highlightHandles = new Handles();

    // Cada que cambie la capa, quitamos todos los resaltados
    this.sharedMapService.featureTable.watch("layer", () => highlightHandles?.removeAll());

    // Resalta al pasar el mouse por encima de una fila
    this.sharedMapService.featureTable.on("cell-pointerover", ({ feature }: any) =>
      this.addHighlight(feature, highlightHandles)
    );

    // Quita el resaltado cuando el mouse sale de la fila
    this.sharedMapService.featureTable.on("cell-pointerout", () => highlightHandles?.removeAll());

    this.view.when(async () => {
      // Al hacer clic sobre una entidad del mapa
      this.view.on("immediate-click", async (evt) => {
        const { results } = await this.view.hitTest(evt);

        results.forEach((result: any) => {
          const graphic = result.graphic;
          // Ignorar gráficos que no pertenezcan a la capa principal
          if (graphic?.layer !== this.sharedMapService.featureTable.layer) return;

          const objectId = graphic.getObjectId();

          // Si ya está seleccionado, lo quitamos; si no, lo agregamos
          if (this.sharedMapService.featureTable.highlightIds.includes(objectId)) {
            this.sharedMapService.featureTable.highlightIds.remove(objectId);
          } else {
            this.sharedMapService.featureTable.highlightIds.add(objectId);
          }
        });
      });

      // Resalta entidades al mover el mouse sobre el mapa
      // Usa debounce para evitar consultas innecesarias
      const highlightOnViewHover = promiseUtils.debounce(async (event: any) => {
        const { results } = await this.view.hitTest(event);

        // Solo dejamos las entidades que pertenecen a nuestra capa
        const candidates = results.filter(
          (result: any) => {
            const graphic = result.graphic;
            return graphic && graphic.layer && graphic.layer === this.sharedMapService.featureTable.layer;
          }
        );

        // Limpia los resaltados actuales (en tabla y vista)
        if (this.sharedMapService.featureTable.rowHighlightIds.length) {
          this.sharedMapService.featureTable.rowHighlightIds.removeAll();
          highlightHandles?.removeAll();
        }

        // Resalta las nuevas entidades encontradas
        candidates.forEach((result: any) => {
          const graphic = result.graphic;
          this.sharedMapService.featureTable.rowHighlightIds.add(graphic.getObjectId());
          this.addHighlight(graphic, highlightHandles);
        });
      });

      // Cada vez que muevo el mouse en el mapa, actualizo el resaltado
      this.view.on("pointer-move", (event) =>
        promiseUtils.ignoreAbortErrors(highlightOnViewHover(event))
      );
    });
  }

  loadConfigMap(): void {
    this.loadView();
    this.loadBaseMap();

    const actionBar = document.querySelector('calcite-action-bar') as any;
    if (actionBar) {
      actionBar.messageOverrides = {
        expand: 'Expandir',
        collapse: 'Cerrar',
      };

      let avatarEl = document.getElementById('logo-img') as HTMLImageElement;
      let tableContainerEl = document.getElementById(
        'tableContainer'
      ) as HTMLElement;
      actionBar.addEventListener('calciteActionBarToggle', (evt: any) => {
        if (actionBar.expanded) {
          avatarEl.classList.remove('calcite-logo-ppal');
          avatarEl.classList.add('calcite-logo-expanded');

          tableContainerEl.style.marginLeft = '12.5rem';
          tableContainerEl.style.width = '88%';
        } else {
          avatarEl.classList.add('calcite-logo-ppal');
          avatarEl.classList.remove('calcite-logo-expanded');

          tableContainerEl.style.marginLeft = '5.5rem';
          tableContainerEl.style.width = '95%';
        }
      });
    }

    const layerPromises = this.map.layers.map((layer) => layer.load());
    Promise.all(layerPromises).then(() => {
      const calciteLoader = document.querySelector('calcite-loader') as any;
      if (calciteLoader) {
        calciteLoader.hidden = true;
      }
      const calciteShell = document.querySelector('calcite-shell') as any;
      if (calciteShell) {
        calciteShell.hidden = false;
      }

      let actionBarExpanded = false;
      document.addEventListener('calciteActionBarToggle', (event) => {
        actionBarExpanded = !actionBarExpanded;
        this.view.padding = {
          left: actionBarExpanded ? 135 : 49,
        };
      });
    });

    if (this.config) {
      this.loadMap();
    }
  }

  loadWidgets(): void {
    if (this.homeWidget) {
      this.view.ui.remove(this.homeWidget);
    }

    if (this.bgExpand) {
      this.view.ui.remove(this.bgExpand);
    }

    if (this.zoomWidget) {
      this.view.ui.remove(this.zoomWidget);
    }

    if (this.scaleBarWidget) {
      this.view.ui.remove(this.scaleBarWidget);
    }

    if (this.distanceMeasurement2D) {
      this.view.ui.remove(this.distanceMeasurement2D);
    }

    if (this.areaMeasurement2D) {
      this.view.ui.remove(this.areaMeasurement2D);
    }

    if (this.searchWidget) {
      this.view.ui.remove(this.searchWidget);
    }

    this.view.ui.add('titleDiv', 'top-right');

    const searchWidgetConfig = this.allWidgets.find(widget => widget.dataPanelId === 'searchWidget');
    if (searchWidgetConfig) {
      this.loadSearchWidget(searchWidgetConfig);
    }

    this.homeWidget = new Home({
      view: this.view,
    });
    this.view.ui.add(this.homeWidget, 'top-right');

    if (this.sharedMapService.config.topic !== 'REGISTRO_SOLICITUDES') {
      this.bgExpand = new Expand({
        view: this.view,
        expandIcon: 'measure',
        expandTooltip: 'Medición',
        content: document.getElementById('measureDiv') as HTMLElement,
      });
    }

    this.view.ui.add(this.bgExpand, 'top-right');

    this.distanceMeasurement2D = new DistanceMeasurement2D({
      view: this.view,
      visible: false,
    });
    this.view.ui.add(this.distanceMeasurement2D, 'bottom-right');

    this.areaMeasurement2D = new AreaMeasurement2D({
      view: this.view,
      visible: false,
    });
    this.view.ui.add(this.areaMeasurement2D, 'bottom-right');

    this.zoomWidget = new Zoom({
      view: this.view,
    });
    this.view.ui.add(this.zoomWidget, 'top-right');

    this.scaleBarWidget = new ScaleBar({
      view: this.view,
    });
    this.view.ui.add(this.scaleBarWidget, {
      position: 'bottom-right',
    });
  }

  getLayerByTitle(title: string) {
    return this.sharedMapService.view?.map?.allLayers?.toArray().filter(
      (layer: any) => layer.title === title
    )[0];
  }

  loadSearchWidget(config: any): void {
    const sources = config.sources.map((source: any) => {
      const layer = this.getLayerByTitle(source.layerId);
      return {
        layer: layer,
        searchFields: source.searchFields,
        displayField: source.displayField,
        name: source.name,
        placeholder: source.placeholder
      };
    });

    this.searchWidget = new Search({
      view: this.view,
      allPlaceholder: 'Buscar aquí',
      includeDefaultSources: true,
      sources: sources
    });

    this.view.ui.add(this.searchWidget, {
      position: 'top-right'
    });
  }

  loadMap(): void {
    this.tokenService
      .getArcgisToken()
      .pipe(
        tap((data: any) => {

          this.tokenService.token = data.token || data;
          const portalUrl = `${this.sharedMapService.getBaseServiceById(
            'URL_PORTAL'
          )}/sharing/rest`;
          const serverUrl = `${this.sharedMapService.getBaseServiceById(
            'URL_SERVER'
          )}/rest/services`;

          esriId.registerToken({
            server: portalUrl,
            token: this.tokenService.token,
          });

          esriId.registerToken({
            server: serverUrl,
            token: this.tokenService.token,
          });

          this.sharedMapService.attributes$.subscribe((attributes: any) => {

            const userRol = attributes['rol'] || '';

            console.log('userRol', userRol, 'LAYERSURL', this.config.mapType.layersUrl);

            if (this.config.mapType.layersUrl) {

              for (let layerUrl of this.config.mapType.layersUrl) {



                const esRolIdeam = userRol === 'IDEAM';
                const esCapaAreasIdeam = layerUrl.id.includes('AREAS') && layerUrl.id.includes('IDEAM');



                if (esRolIdeam && !esCapaAreasIdeam) continue;
                if (!esRolIdeam && esCapaAreasIdeam) continue;


                const url = layerUrl.url;
                const id = 'geovisor_' + layerUrl.id;
                const title = layerUrl.title;
                const visible = layerUrl.visible;
                const definitionExpression = layerUrl.definitionExpression;
                const listMode = layerUrl.listMode ? layerUrl.listMode : 'show';
                const format = layerUrl.format;
                let layer: any;
                if (url.includes('/MapServer')) {
                  layer = new MapImageLayer({
                    id,
                    title,
                    url,
                    visible,
                    listMode,
                  });
                } else if (url.includes('/FeatureServer')) {
                  layer = new FeatureLayer({
                    id,
                    title,
                    url,
                    visible,
                    definitionExpression,
                    listMode,
                  });
                } else if (url.includes('/ImageServer')) {
                  layer = new ImageryLayer({
                    id,
                    title,
                    url,
                    visible,
                    definitionExpression,
                    listMode,
                  });

                  if (format) {
                    layer.format = format;
                  }
                } else if (url.includes('/VectorTile')) {
                  layer = new VectorTileLayer({
                    id,
                    title,
                    url,
                    visible,
                    listMode,
                  } as any);
                } else if (url.toUpperCase().includes('/WMS')) {
                  layer = new WMSLayer({
                    id,
                    title,
                    url,
                    visible,
                    listMode,
                  });

                  if (layerUrl.sublayers) {
                    layer.sublayers = layerUrl.sublayers;
                  }
                } else if (url.toUpperCase().includes('/WFS')) {
                  layer = new WFSLayer({
                    id,
                    title,
                    url,
                    visible,
                    listMode,
                  });
                } else {
                  console.log('Tipo de servidor no reconocido');
                }

                if (layer) {
                  if (layerUrl.definitionExpression) {
                    layer.definitionExpression = layerUrl.definitionExpression;
                  }

                  if (layerUrl.effect) {
                    layer.effect = layerUrl.effect;
                  }

                  if (this.config.mapType.type === 'OPACITY_MAP' && this.year) {
                    layer.renderer = this.createRendererOpacity(
                      parseInt(this.year),
                      layerUrl.field_renderer
                    );
                  }

                  if (this.config.mapType.type === 'HEAT_MAP') {
                    const renderer = {
                      type: 'heatmap',
                      colorStops: layerUrl.colorStops,
                      maxDensity: 0.09,
                      minDensity: 0,
                    } as any;

                    layer.renderer = renderer;
                  }

                  let groupTitle: string = layerUrl.groupLayer;
                  if (groupTitle) {
                    this.addToGroupLayer(layer, groupTitle);
                  } else {
                    this.sharedMapService.view?.map?.add(layer);
                  }

                  if (layer instanceof MapImageLayer) {
                    layer.loadAll().then((data: any) => {
                      const processSublayers = (sublayers: any[]) => {
                        for (const sublayer of sublayers) {
                          const customSublayer = this.filterSublayerById(sublayer.layer.id, sublayer.id);
                          if (customSublayer) {
                            const fieldInfos = this.getFieldInfos(customSublayer, sublayer.fields);
                            const template = this.getTemplate(fieldInfos, customSublayer, sublayer.title);
                            sublayer.popupTemplate = template;
                          }
                          if (sublayer.sublayers && sublayer.sublayers.length > 0) {
                            processSublayers(sublayer.sublayers.items);
                          }
                        }
                      };

                      if (data.sublayers && data.sublayers.length > 0) {
                        processSublayers(data.sublayers.items || data.sublayers.toArray());
                      }
                      this.filterByCode(layer);
                    });
                  } else if (layer instanceof FeatureLayer) {
                    layer.load().then((data) => {
                      const customLayer = this.filterLayerById(data.id);
                      if (customLayer) {
                        const fieldInfos = this.getFieldInfos(
                          customLayer,
                          data.fields
                        );
                        const template = this.getTemplate(
                          fieldInfos,
                          customLayer,
                          data.title
                        );
                        data.popupTemplate = template;
                        this.filterByCode(layer);
                      }
                    });
                  } else if (layer instanceof ImageryLayer) {
                  }
                }
              }

              this.verifyAllLayersLoaded();
            }
          });


        }),
        catchError((error) => {
          console.error('Error al obtener el token:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  //cargar traslape después de cargar las capas

  private async cargarComponenteTraslape(): Promise<void> {
    try {
      // Asumiendo que sharedMapService.initView() o similar inicializa el mapa
      // y establece sharedMapService.view
      // Ejemplo: await this.sharedMapService.initView(this.mapViewNode.nativeElement, this.topic);

      if (this.sharedMapService.view) {
        this.sharedMapService.view.when(() => {
          this.mapReady = true;
          console.log('Mapa listo en CmpGeovisorComponent', this.tokenService.token, " --- ");
          // Aquí puedes realizar otras acciones que dependan de que el mapa esté listo
        }).catch((error: any) => {
          console.error('Error al esperar que la vista del mapa esté lista:', error);
          this.mapReady = false;
        });
      } else {
        // Esto podría ocurrir si la inicialización del mapa aún no ha sucedido
        // o falló antes de establecer la vista.
        // Considera llamar a la inicialización del mapa aquí si es necesario
        // o asegurar que se llame antes.
        console.warn('SharedMapService.view no está disponible aún en initializeMapAndRelated.');
        // Podrías intentar inicializar el mapa aquí si no se ha hecho
        // await this.sharedMapService.initView(...);
        // y luego reintentar el .when()
      }
    } catch (error) {
      console.error('Error durante la inicialización del mapa:', error);
      this.mapReady = false;
    }
  }

  verifyAllLayersLoaded(): void {
    const layerPromises = this.map.layers.map(layer => {
      layer.load();
    });
    Promise.all(layerPromises).then(() => {
      console.log("✅ TODAS las capas (WebMap + loadMap) han cargado correctamente.");
      this.sharedMapService.loadMapImageLayerComplete();
      this.cargarComponenteTraslape();
    }).catch(error => {
      console.error("❌ Error en la carga de algunas capas:", error);
    });
  }

  private addToGroupLayer(layer: any, groupTitle: string): void {
    const existingGroupLayer = this.sharedMapService.view?.map?.allLayers?.find(
      (l: any) => l instanceof GroupLayer && l.title === groupTitle
    ) as GroupLayer;
    if (existingGroupLayer) {
      existingGroupLayer.layers.add(layer);
    } else {
      const newGroupLayer = new GroupLayer({
        title: groupTitle,
        layers: [layer],
      });
      this.sharedMapService.view?.map?.add(newGroupLayer);
    }
  }

  loadSymbologies(): void {
    this.map.layers.forEach((layer: any) => { });
  }

  filterLayerById(id: string): any {
    if (this.config.mapType.layersUrl) {
      const layer: any = this.config.mapType.layersUrl.filter(
        (item: any) => 'geovisor_' + item.id === id
      )[0];
      return layer;
    } else {
      return null;
    }
  }

  filterSublayerById(id: string, sublayerId: number): any {
    const layer: any = this.config.mapType.layersUrl.filter(
      (item: any) => 'geovisor_' + item.id === id
    )[0];
    const sublayer: any = layer.sublayers.filter(
      (item: any) => item.id === sublayerId
    )[0];
    return sublayer;
  }

  getTemplate(fieldInfos: any, layer: any, title: string) {
    let content = [{ type: 'fields', fieldInfos: fieldInfos }];
    if (layer.popupContent) {
      if (typeof layer.popupContent !== 'object') {
        content = layer.popupContent;
      }
    }

    let displayField = layer.displayField;
    if (!displayField) {
      displayField = '';
    } else {
      displayField = '{' + displayField + '}';
    }

    let customTemplate = {
      title: title + ': ' + displayField,
      content: content,
    };

    if (typeof layer.popupContent === 'object') {
      customTemplate = layer.popupContent;
    }

    const template = new PopupTemplate(customTemplate);

    return template;
  }

  getFieldInfos(customLayer: any, fields: any) {
    const fieldInfos = [];
    if (
      customLayer.fields &&
      customLayer.fields.length === 1 &&
      customLayer.fields[0] === '*'
    ) {
      for (let field of fields) {
        const fieldInfo = {
          fieldName: field.name,
          label: field.alias,
          visible: true,
        };
        fieldInfos.push(fieldInfo);
      }
    } else {
      for (let fieldName of customLayer.fields) {
        const field = fields.find((f: any) => f.name === fieldName);
        if (field) {
          const fieldInfo = {
            fieldName: field.name,
            label: field.alias,
            visible: true,
          };
          fieldInfos.push(fieldInfo);
        }
      }
    }
    return fieldInfos;
  }

  addPanel(panelId: string, heading: string, fields: string[]): void {
    const panel = document.createElement('calcite-panel');
    panel.setAttribute('data-panel-id', panelId);
    panel.hidden = true;

    const div = document.createElement('div');
    div.id = `${panelId.toLowerCase()}-container`;

    panel.innerHTML = `
      <div slot="header">${heading}</div>
      ${div.outerHTML}
    `;
    const panelContainer = document.querySelector('calcite-shell-panel');
    if (panelContainer) {
      panelContainer.appendChild(panel);
    }
  }

  createRendererOpacity(year: number, field: string): any {
    const opacityStops = [
      {
        opacity: 1,
        value: year,
      },
      {
        opacity: 0,
        value: year + 1,
      },
    ];

    return {
      type: 'simple',
      symbol: {
        type: 'simple-fill',
        color: 'rgb(0, 0, 0)',
        outline: null,
      },
      visualVariables: [
        {
          type: 'opacity',
          field,
          stops: opacityStops,
          legendOptions: {
            showLegend: false,
          },
        },
        {
          type: 'color',
          field,
          legendOptions: {
            title: 'Por año:',
          },
          stops: [
            {
              value: year,
              color: '#0ff',
              label: 'en ' + year,
            },
            {
              value: year - 1,
              color: '#f0f',
              label: 'en ' + (year - 1),
            },
            {
              value: year - 2,
              color: '#404',
              label: 'antes ' + (year - 2),
            },
          ],
        },
      ],
    };
  }

  getBaseServiceById(id: string): any {
    const result = this.settings.base_services.find(
      (service: { id: string }) => service.id === id
    );
    return result.value;
  }

  async filterByCode(layer: any) {
    const layerView = (await this.view.whenLayerView(layer)) as any;

    let type;
    let code;

    if (this.city) {
      type = 'CITY';
      code = this.city;
    } else if (this.state) {
      type = 'STATE';
      code = this.state;
    } else if (this.region) {
      type = 'REGION';
      code = this.region;
    } else if (this.ecoregion) {
      type = 'ECO_REGION';
      code = this.ecoregion;
    }

    if (type && code) {
      let locationUrl = '';
      switch (type) {
        case 'CITY':
          locationUrl = this.getBaseServiceById('MUNICIPIOS');
          break;
        case 'STATE':
          locationUrl = this.getBaseServiceById('DEPARTAMENTOS');
          break;
        case 'REGION':
          locationUrl = this.getBaseServiceById('REGIONES');
          break;
        case 'ECO_REGION':
          locationUrl = this.getBaseServiceById('ECOREGIONES');
          break;
      }

      const queryParamas = new Query({
        outFields: ['*'],
        returnGeometry: true,
        where: 'FID = ' + code,
        outSpatialReference: this.view.spatialReference,
      });

      query.executeQueryJSON(locationUrl, queryParamas).then((results) => {
        if (results.features.length > 0) {
          const firstFeature = results.features[0];

          const fillSymbol: any = {
            type: 'simple-line',
            color: [255, 0, 0], // red color
            width: 2,
            style: 'solid',
          };

          const graphic = new Graphic({
            geometry: firstFeature.geometry,
            symbol: fillSymbol,
          });

          this.sharedMapService.graphicsLayer.add(graphic);
          this.view.goTo(firstFeature.geometry);

          const filter = new FeatureFilter({
            geometry: firstFeature.geometry,
            spatialRelationship: 'contains',
          });

          layerView.filter = filter;
        }
      });
    }
  }

  isActive(panelId: string): boolean {
    return (
      this.allWidgets.find((widget) => widget.dataPanelId === panelId)?.active ??
      false
    );
  }

  private captureInitialAttributes(): void {
    Array.from(this.elRef.nativeElement.attributes).forEach((attr: any) => {
      this.sharedMapService.updateAttribute(attr.name, attr.value);
    });
  }

  measurementClick(event: Event, medida: any) {
    const element = event.target as HTMLElement;

    this.setActiveWidget(null, element);
    if (!element.classList.contains('active')) {
      this.setActiveWidget(medida, element);
    } else {
      this.setActiveButton(null);
    }
  }

  setActiveWidget(type: any, element: any) {
    switch (type) {
      case 'distance':
        this.areaMeasurement2D.visible = false;
        this.distanceMeasurement2D.visible = true;
        this.distanceMeasurement2D.viewModel.start();
        this.setActiveButton(element);
        break;
      case 'area':
        this.distanceMeasurement2D.visible = false;
        this.areaMeasurement2D.visible = true;
        this.areaMeasurement2D.viewModel.start();
        this.setActiveButton(element);
        break;
      case 'clear':
        this.distanceMeasurement2D.visible = false;
        this.areaMeasurement2D.visible = false;
        this.setActiveButton(null);
        break;
      case null:
        this.areaMeasurement2D.visible = false;
        this.distanceMeasurement2D.visible = false;
        break;
    }
  }

  setActiveButton(selectedButton: any) {
    this.view.focus();
    let elements = document.getElementsByClassName('active');
    for (let i = 0; i < elements.length; i++) {
      elements[i].classList.remove('active');
    }
    if (selectedButton) {
      selectedButton.classList.add('active');
    }
  }

  downloadData(): void {
    if (this.sharedMapService.featureTable.layer) {
      let layer: any = this.sharedMapService.featureTable.layer;

      let listFields: string[] = [];
      layer.fields.forEach((field: any) => {
        listFields.push(field.name);
      });

      let query = new Query();
      query.where = '1=1';
      query.returnGeometry = false;
      query.outFields = ['*'];
      query.outSpatialReference = this.sharedMapService.view?.spatialReference;

      layer
        .queryFeatures(query)
        .then((results: any) => {
          if (results.features.length > 0) {
            const data = results.features.map(function (feature: any) {
              return Object.keys(feature.attributes)
                .filter(function (key) {
                  return listFields.indexOf(key) !== -1;
                })
                .reduce(function (obj: any, key) {
                  obj[key] = feature.attributes[key];
                  return obj;
                }, {});
            });

            let csvContent = this.saveDataInCSV(data);

            var hiddenElement = document.createElement('a');
            hiddenElement.href =
              'data:text/csv;charset=utf-8,' + encodeURI(csvContent);
            hiddenElement.target = '_blank';
            hiddenElement.download = `${layer.title}.csv`;
            hiddenElement.click();
          }
        })
        .catch((error: any) => {
          console.error(error);
        });
    }
  }

  saveDataInCSV(data: Array<any>): string {
    if (data.length == 0) {
      return '';
    }

    let propertyNames = Object.keys(data[0]);
    let rowWithPropertyNames = propertyNames.join(',') + '\n';

    let csvContent = rowWithPropertyNames;

    let rows: string[] = [];

    data.forEach((item) => {
      let values: string[] = [];

      propertyNames.forEach((key) => {
        let val: any = item[key];

        if (val !== undefined && val !== null) {
          val = new String(val);
        } else {
          val = '';
        }
        values.push(val);
      });
      rows.push(values.join(','));
    });
    csvContent += rows.join('\n');

    return csvContent;
  }

  onValidationFinished(messages: string[]) {
    this.onValidationCompleted.emit(messages);
  }

  onProgressOfValidation({ validationsCompleted, totalValidations }: { validationsCompleted: number, totalValidations: number }): void {
    this.onValidationProgress.emit({ validationsCompleted, totalValidations });
  }

  onFileLoaded(file: File): void {
    this.onFileSelected.emit(file);
  }

  onNewNotification(notification: {
    severity: 'error' | 'success';
    summary: string;
    detail: string;
  }): void {
    this.onNotification.emit(notification);
  }

  widgets(): any[] {
    return this.allWidgets.filter(widget => widget.dataPanelId !== 'searchWidget');
  }

  onFinishTraslapeResult() {
    if (this.resultadoTraslape) {
      this.resultadoTraslapeChange.emit(this.resultadoTraslape);
      console.log('Función emitida al segundo componente.');
    }
  }
}
