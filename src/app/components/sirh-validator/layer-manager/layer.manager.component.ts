import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SharedMapService } from '../../../services/shared-map.service';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import * as geoprocessor from '@arcgis/core/rest/geoprocessor';

@Component({
  selector: 'layer-manager-component',
  templateUrl: './layer.manager.component.html',
  styleUrls: ['/layer.manager.component.scss'],
})
export class LayerManagerComponent {
  @Input() public validationFinished!: boolean;

  @Output() public onLayerUploaded: EventEmitter<FeatureLayer> =
    new EventEmitter();
  @Output() public onFileLoaded: EventEmitter<File> = new EventEmitter();
  @Output() public onNotification: EventEmitter<{
    severity: 'error' | 'success';
    summary: string;
    detail: string;
  }> = new EventEmitter();

  public file!: File;
  public loading: boolean = false;
  public gpUrl: string =
    'https://geo.minambiente.gov.co/server/rest/services/Utils/uploadfiles/GPServer';

  constructor(
    private sharedMapService: SharedMapService
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.loading = true;

    if (input.files && input.files.length > 0) {
      this.file = input.files[0];
      this.addFile(this.file);
      this.onFileLoaded.emit(this.file);
      input.value = '';
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.click();
    }
  }

  addFile(file: File): void {
    this.uploadFile(file)
      .then((itemID: string) => {
        const fileNameWithoutExtension: string = file.name.replace(
          /\.[^/.]+$/,
          ''
        );
        this.addShapefileToMap(itemID, fileNameWithoutExtension);
      })
      .catch(() => {
        this.loading = false;
        this.onNotification.emit({
          severity: 'error',
          summary: 'Carga de archivo',
          detail: 'Error al subir el archivo, intente de nuevo.',
        });
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
          this.onNotification.emit({
            severity: 'error',
            summary: 'Carga de archivo',
            detail: 'Error al subir el archivo, intente de nuevo.',
          });
        }
      });
  }

  addShapefileToMap(itemID: string, fileName: string): void {
    const url = `${this.gpUrl}/Upload%20Files`;

    const params = {
      zip_file: `{'itemID':'${itemID}'}`,
    };

    geoprocessor
      .submitJob(url, params)
      .then((jobInfo) => {
        const options = {
          statusCallback: (jobStatusInfo: string) => {
            progTest(jobStatusInfo);
          },
        };

        jobInfo
          .waitForJobCompletion(options)
          .then((jobInfoCompleted) => {
            jobInfoCompleted
              .fetchResultData('results_feature')
              .then((data: any) => {
                const featureLayer = new FeatureLayer({
                  title: fileName,
                  fields: data.value.fields,
                  geometryType: data.value.geometryType,
                  source: data.value.features,
                });

                this.sharedMapService.view.map.add(featureLayer);
                featureLayer.when(() => {
                  this.sharedMapService?.view?.goTo(featureLayer.fullExtent);
                  featureLayer.popupTemplate =
                    this.createPopupTemplateFromFields(featureLayer);
                  this.onLayerUploaded.emit(featureLayer);
                });
                this.onNotification.emit({
                  severity: 'success',
                  summary: 'Carga de archivo',
                  detail: 'El archivo se cargó correctamente.',
                });
                this.loading = false;
              })
              .catch((error) => {
                this.onNotification.emit({
                  severity: 'error',
                  summary: 'Carga de archivo',
                  detail: 'Error al obtener datos: ' + error,
                });
                this.loading = false;
              });
          })
          .catch((error) => {
            console.error(
              'Messages',
              error.messages.map((m: any) => [m.description, m.type])
            );
            this.onNotification.emit({
              severity: 'error',
              summary: 'Carga de archivo',
              detail: 'Error al completar el trabajo',
            });
            this.loading = false;
          });
      })
      .catch((error) => {
        this.onNotification.emit({
          severity: 'error',
          summary: 'Carga de archivo',
          detail: 'Error en el geoproceso, intente de nuevo.',
        });
        this.loading = false;
      });

    const progTest = (value: any) => {
      if (value.jobStatus == 'job-executing') {
        this.loading = true;
      }
    };
  }

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
}
