import { Injectable } from '@angular/core';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import MapView from '@arcgis/core/views/MapView';
import FeatureTable from "@arcgis/core/widgets/FeatureTable";
import { BehaviorSubject, Subject } from 'rxjs';
import { LabelVisibilityChange } from '../dto/label.visibility.change';

@Injectable({
  providedIn: 'root'
})
export class SharedMapService {
  public config: any;

  public view!: MapView;
  public allServices: any[] = [];
  public allLayers: any[] = [];
  public graphicsLayer!: GraphicsLayer;
  public featureTable!: FeatureTable;

  public tableContainer: any;

  private viewReadyCallback: ((view: MapView) => void)[] = [];

  private successAlertSubject = new Subject<string>();
  private warningAlertSubject = new Subject<string>();
  private errorAlertSubject = new Subject<string>();
  private showHideLabelsSubject = new Subject<LabelVisibilityChange>();

  public successAlert$ = this.successAlertSubject.asObservable();
  public warningAlert$ = this.warningAlertSubject.asObservable();
  public errorAlert$ = this.errorAlertSubject.asObservable();
  public showHideLabels$ = this.showHideLabelsSubject.asObservable();

  private loadMapImageLayerCompleteSubject = new BehaviorSubject<String>('');
  public loadMapImageLayerComplete$ = this.loadMapImageLayerCompleteSubject.asObservable();

  private attributesSource = new BehaviorSubject<{ [key: string]: any }>({});
  public attributes$ = this.attributesSource.asObservable();

  public showSuccessAlert(message: string) {
    this.successAlertSubject.next(message);
  }

  public showWarningAlert(message: string) {
    this.warningAlertSubject.next(message);
  }

  public showErrorAlert(message: string) {
    this.errorAlertSubject.next(message);
  }

  public showHideLabels(show: boolean, messageLeft: string = '', messageRight: string = '') {
    const change: LabelVisibilityChange = { show, messageLeft, messageRight };
    this.showHideLabelsSubject.next(change);
  }

  public whenViewReady(): Promise<MapView> {
    return new Promise((resolve) => {
      if (this.view) {
        resolve(this.view);
      } else {
        this.viewReadyCallback.push(resolve);
      }
    });
  }

  public setView(view: MapView) {
    this.view = view;
    this.viewReadyCallback.forEach((callback) => callback(view));
    this.viewReadyCallback = [];
  }

  public loadMapImageLayerComplete() {
    if (this.loadMapImageLayerCompleteSubject.getValue() !== 'TRUE') {
      this.loadMapImageLayerCompleteSubject.next('TRUE');
    }
  }

  updateAttribute(key: string, value: any): void {
    const currentAttributes = this.attributesSource.value;
    const updatedAttributes = { ...currentAttributes, [key]: value };
    this.attributesSource.next(updatedAttributes);
  }

  getAttribute(key: string): any {
    return this.attributesSource.value[key];
  }

  toggleFeatureTable(showTable: boolean) {
    showTable
      ? this.tableContainer.classList.remove('hidden-table')
      : this.tableContainer.classList.add('hidden-table');
  }

  getBaseServiceById(id: string): any {
    const result = this.config.settings.base_services.find(
      (service: { id: string }) => service.id === id
    );
    return result.url;
  }
}
