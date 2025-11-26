import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SharedMapService } from '../../services/shared-map.service';
import * as geoprocessor from '@arcgis/core/rest/geoprocessor';
import { TokenService } from 'src/app/services/token.service';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

@Component({
  selector: 'cmp-extact-data-component',
  templateUrl: './cmp-extact-data.component.html',
  styleUrls: ['./cmp-extact-data.component.scss'],
})
export class CmpExtactDataComponent implements OnInit, OnDestroy {
  loading: boolean | null = false;
  labelLoading: string = 'Descargar';
  loadingStatus: string = '';
  idCargue = '';

  constructor(
    private sharedMapService: SharedMapService,
    private router: Router,
    private tokenService: TokenService,
    private http: HttpClient
  ) {
    this.sharedMapService.attributes$.subscribe((attributes) => {
      if (attributes['id-cargue']) {
        this.idCargue = attributes['id-cargue'];
      }
    });
  }

  ngOnInit() {

  }

  async downloadSHP() {
    this.loading = true;
    const gpUrl =
      'https://geo.minambiente.gov.co/server/rest/services/Utils/ExportFeatures/GPServer/Tool';

    const layerUrl = this.sharedMapService.config.mapType.layersUrl[0].url;

    const params = {
      feature_service_url: layerUrl,
      where_clause: `id_cargue = '${this.idCargue}'`
    };

    geoprocessor
      .submitJob(gpUrl, params)
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
            console.log('Job Completed Info:', jobInfoCompleted);
            this.loading = false;
            this.loadingStatus = this.labelLoading;

            jobInfoCompleted
              .fetchResultData('output_url')
              .then((data) => {
                this.downloadFile(data.value);
              })
              .catch((error) => {
                console.log('Error al obtener datos:', error);
                this.loading = false;
                this.loadingStatus = this.labelLoading;
              });
          })
          .catch((error) => {
            console.log('Error al completar el trabajo:', error);
            this.sharedMapService.showErrorAlert('Se ha producido un error al momento de la exportacion. Comuniquese con el administrador del sistema.');
            console.log('Messages', error.messages.map((m:any) => [m.description, m.type]));
            this.loading = false;
            this.loadingStatus = this.labelLoading;
          });
      })
      .catch((error) => {
        console.log(error);
        this.loading = false;
        this.loadingStatus = this.labelLoading;
      });

    const progTest = (value: any) => {
      console.log(value.jobStatus);

      if (value.jobStatus == 'job-executing') {
        this.loading = true;
        this.loadingStatus = 'Descargando';
      }
    };
  }

  downloadFile(url: any) {
    this.http.get(`${url}?token=${this.tokenService.token}`, { responseType: 'blob' })
      .pipe(
        tap((blob) => {
          const link = document.createElement('a');
          const objectUrl = URL.createObjectURL(blob);
          link.href = objectUrl;
          link.download = `predios_${this.idCargue}.zip`;
          link.click();
          URL.revokeObjectURL(objectUrl);
        })
      )
      .subscribe({
        error: (error) => {
          console.log('Error al descargar el archivo:', error);
        }
      });
  }

  ngOnDestroy() {

  }

}
