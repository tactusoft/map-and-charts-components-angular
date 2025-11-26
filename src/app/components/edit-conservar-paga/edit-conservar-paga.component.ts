import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { SharedMapService } from 'src/app/services/shared-map.service';

import WebMap from '@arcgis/core/WebMap';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Color from '@arcgis/core/Color';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import Graphic from '@arcgis/core/Graphic';

@Component({
  selector: 'edit-conservar-paga',
  templateUrl: './edit-conservar-paga.component.html',
  styleUrls: ['./edit-conservar-paga.component.scss'],
})
export class EditConservarPagaComponent {
  @ViewChild('tipoTenenSelect', { static: false }) tipoTenenSelect!: ElementRef;

  fileUploadSoporte: File | undefined;
  featureLayer: FeatureLayer | undefined;
  highlightLayer = new GraphicsLayer();
  attributes: any = {};
  disabledFields = true;

  idPredio = '';
  cambios = '';

  openEditEditBlock = false;
  openEditConfirmDialog = false;
  openEnabledConfirmDialog = false;
  openExtraDataBlock = false;

  loading = false;

  domainFields = ['tipo_tenen', 'validacion', 'doc_propi'];
  domains: any = {};




  constructor(private sharedMapService: SharedMapService) {
    this.sharedMapService.loadMapImageLayerComplete$.subscribe((param: any) => {
      if (param === 'TRUE') {
        if (this.sharedMapService.view.map instanceof WebMap) {
          this.sharedMapService.view.map.when(() => {
            this.featureLayer = this.sharedMapService?.view?.map.allLayers.find(
              (layer: any) => layer.id.includes('AREAS_PRIORIZADAS')
            ) as FeatureLayer;

            this.consultarDominios(this.featureLayer);
            //   this.addEditorWidget();
          });
        }
      }
    });
  }

  onChangeKeyFormControl(event: Event) {
    this.idPredio = (event.target as HTMLInputElement).value;
  }
  onChangeKeyCambios(event: Event) {
    this.cambios = (event.target as HTMLInputElement).value;
  }
  onChangeAttributesControl(event: Event) {
    const { name, value } = event.target as HTMLInputElement;
    this.attributes![name] = value;
  }

  onSelectChange(event: any) {
    const { name, value } = event.target as HTMLInputElement;

    this.attributes![name] = value;
  }



  validateSiguiente() {
    const isEmpty = (value: any): boolean => {
      return (
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '')
      );
    };

    if (
      isEmpty(this.attributes['doc_propi']) ||
      isEmpty(this.attributes['nom_pred']) ||
      isEmpty(this.attributes['validacion']) ||
      isEmpty(this.attributes['tipo_tenen'])
    ) {
      this.sharedMapService.showWarningAlert(
        'Hay campos requeridos faltantes.'
      );
      return;
    }

    this.openEditEditBlock = false;
    this.openExtraDataBlock = true;
  }


  parseString(number: Number) {
    return String(number)
  }

  async consultarDominios(featureLayer: FeatureLayer) {
    await featureLayer.load();

    const layerFields = featureLayer?.fields;
    const domains = layerFields
      .filter((f: __esri.Field) => this.domainFields.includes(f.name))
      .map((f: any) => ({ name: f.name, domain: f.domain.codedValues }));
    //console.log('dominios', domains);


    domains.forEach((d) => {
      this.domains[d.name] = d.domain;
    });


    //console.log('final domains', this.domains);
  }

  triggerFileInputSoporte() {
    const fileInput = document.getElementById('fileInputSoporte');

    if (fileInput) {
      fileInput.click();
    }
  }

  habilitarCambios() {
    this.disabledFields = false;
    this.openEnabledConfirmDialog = false;
  }

  async buscarPredio() {
    this.openEditEditBlock = false;
    this.openEditConfirmDialog = false;
    this.openEnabledConfirmDialog = false;
    this.openExtraDataBlock = false;
    try {
      const data = await this.featureLayer?.queryFeatures({
        where: `id_predio = '${this.idPredio}'`,
        outFields: ['*'],
        returnGeometry: true,
      });
      const features = data?.features;
      if (features!.length > 0) {
        this.attributes = features![0].attributes;
        const geometry = features![0].geometry;
        this.highlightAndGoTo(geometry);
        this.openEditEditBlock = true;
      } else {
        this.sharedMapService.showWarningAlert(
          'No se ha encontrado un predio con esa ID. Intente con otro.'
        );
      }
    } catch (error) {
      console.error(error);
      this.sharedMapService.showErrorAlert('Ha ocurrido un error');
    }
  }

  async highlightAndGoTo(geometry: any) {
    const highlightSymbol = new SimpleFillSymbol({
      color: new Color([0, 0, 0, 0]),
      outline: {
        color: [255, 255, 0], // Amarillo
        width: 3,
      },
    });

    // Asegúrate de tener la capa de gráficos disponible y limpia
    if (!this.highlightLayer) {
      this.highlightLayer = new GraphicsLayer();
      this.sharedMapService.view.map.add(this.highlightLayer);
    }

    this.sharedMapService.view.map.add(this.highlightLayer);

    this.highlightLayer.removeAll(); // Limpia resaltados anteriores

    // Crea el nuevo gráfico
    const highlightGraphic = new Graphic({
      geometry: geometry,
      symbol: highlightSymbol,
    });

    // Agrega el gráfico para que se dibuje el contorno
    this.highlightLayer.add(highlightGraphic);

    // Mueve la vista a la geometría
    await this.sharedMapService.view.goTo(geometry);
  }

  async applyEditsFeatureLayer() {
   // console.log(this.attributes);

    this.attributes = { attributes: this.attributes };

    const data = await this.featureLayer?.applyEdits({
      updateFeatures: [this.attributes],
    });
   // console.log('applyEditsFeatureLayer', data);

    this.openEditConfirmDialog = false;
    this.openEditEditBlock = false;
    this.openEnabledConfirmDialog = false;
    this.openExtraDataBlock = false;
    this.attributes = null;
  }

  onFileSelectedSoporte(event: any) {
    const input = event.target;
    const file: File | undefined = input.files?.[0];
    this.fileUploadSoporte = file;

    if (!file) {
      this.sharedMapService.showErrorAlert('Debe seleccionar un archivo.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.sharedMapService.showErrorAlert(
        'El archivo debe tener extensión .zip.'
      );
      return;
    }
  }

  async guardarCambios() {
    this.loading = true;
    const token =
      'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIxcG93WXltSnpza284MnhuNXIxZE0xMk5rNTN1bDhVdTdpZkV1WjJVWHp3In0.eyJleHAiOjE3NjAwMjYwODIsImlhdCI6MTc2MDAyNTc4MiwianRpIjoiZDBkNWFjNzEtMzg4ZS00MDA4LTk5NWYtNjBlODQ4MzU0ZDRhIiwiaXNzIjoiaHR0cHM6Ly9kZXYtbG9naW4ubWluYW1iaWVudGUuZ292LmNvL3JlYWxtcy9hbWJpZW50ZSIsImF1ZCI6WyJyZWFsbS1tYW5hZ2VtZW50IiwiY29uc2VydmFyLXBhZ2EtdWkiLCJhY2NvdW50Il0sInN1YiI6ImU3YjkyZDQyLTJlNzktNDA0OC05YWQ0LTZhZTFlZDgzYzYyNyIsInR5cCI6IkJlYXJlciIsImF6cCI6ImNvbnNlcnZhci1wYWdhLWFkbWluIiwic2Vzc2lvbl9zdGF0ZSI6IjYyNWNkNDU2LWYxNzgtNGQ2Zi1hMDIwLTdiZDhkYzZmMTIwMyIsImFjciI6IjEiLCJhbGxvd2VkLW9yaWdpbnMiOlsiKiJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsInVzZXIiLCJkZWZhdWx0LXJvbGVzLXNpbmEiXX0sInJlc291cmNlX2FjY2VzcyI6eyJyZWFsbS1tYW5hZ2VtZW50Ijp7InJvbGVzIjpbIm1hbmFnZS11c2VycyIsInZpZXctdXNlcnMiLCJxdWVyeS1ncm91cHMiLCJxdWVyeS11c2VycyJdfSwiY29uc2VydmFyLXBhZ2EtdWkiOnsicm9sZXMiOlsiRGluYW1pemFkb3IiXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoicHJvZmlsZSByb2xfMSBlbWFpbCBhdHJpYnV0bzEgR3JvdXBzIExPQSBkYXRvc19iYXNpY29zIG51bWVyb0lkZW50aWZpY2FjaW9uIiwic2lkIjoiNjI1Y2Q0NTYtZjE3OC00ZDZmLWEwMjAtN2JkOGRjNmYxMjAzIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJudW1lcm9JZGVudGlmaWNhY2lvbiI6IjE1MTUxNTE1IiwicGVybWlzc2lvbnMiOnsicmVhbG0tbWFuYWdlbWVudCI6WyJtYW5hZ2UtdXNlcnMiLCJ2aWV3LXVzZXJzIiwicXVlcnktZ3JvdXBzIiwicXVlcnktdXNlcnMiXSwiY29uc2VydmFyLXBhZ2EtdWkiOlsiRGluYW1pemFkb3IiXSwiYWNjb3VudCI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19LCJncm91cHMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsInVzZXIiLCJkZWZhdWx0LXJvbGVzLXNpbmEiXSwicHJlZmVycmVkX3VzZXJuYW1lIjoiY29ycG9hbWF6b27DrWFzZGV2IiwiYXRyaWJ1dG8xIjoiMTUxNTE1MTUiLCJlbWFpbCI6Im1hbnVlbC5hcnJveW9AeW9wbWFpbC5jb20ifQ.G1XYGTNdg4G_deBiCJOF956XTxtAEaGsS4rEwTTnu_5KO-_EaFNmoyxtdht1s6ul0BH9UcnHU9WqChAXIczOKEVpUlcfYHvofEwADDVwedPqJ0lY5TeLNUajpbIozZviWp7tY0avLg0lOm2rq5ZBvkJCGNyoDCncqcq3vM5Knk4J_8nXsgI9SJ5hvvBBbv0Pud-bBq2Q28guwFQnwqz_Q-3uw9mXbHL0JdelQmDW-brwrV4tr4JNRd114B9m2YvteDoOjLnhQIx4U6DT4eqkDe6QRGVbZS7KJcNjRCX5xV-xKXkzc0wZm_Ds7unWchlnOzNE_5sxTKSR_7Gyv1ssTw';
    const url =
      'https://dev-conservar-paga-admin.minambiente.gov.co/api/crear_predio_observacion/';

    try {
      const form = new FormData();
      form.append('archivo', this.fileUploadSoporte!);
      form.append('predio', `${this.idPredio}`);
      form.append('observacion', this.cambios);

      const options = {
        method: 'post',
        body: form,
        headers: {
          Authorization: token,
        },
      };

      const rawResponse = await fetch(url, options);
      const response = await rawResponse.json();
      //console.log(response);

      await this.applyEditsFeatureLayer();

      this.sharedMapService.showSuccessAlert(
        'La edición de los atributos ha sido exitosa'
      );
    } catch (error: any) {
      console.error(error);
      this.sharedMapService.showErrorAlert(
        `Ha ocurrido un error. ${error.error}`
      );
    } finally {
      this.loading = false;
    }
  }
}
