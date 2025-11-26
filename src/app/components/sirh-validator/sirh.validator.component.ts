import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  POMCALayerName,
  PORHLayerName,
  ProjectName,
} from './types/sirhValidator';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

@Component({
    selector: 'sirh-validator-component',
    templateUrl: './sirh.validator.component.html',
    styleUrls: [],
  })
export class SirhValidatorComponent {
  public validationFinished: boolean = false;

  @Input() public layerNameToValidate!: POMCALayerName | PORHLayerName;
  @Input() public projectName!: ProjectName;

  @Output() public onValidationFinished: EventEmitter<string[]> = new EventEmitter();
  @Output() public onValidationProgress: EventEmitter<{validationsCompleted: number, totalValidations: number}> = new EventEmitter();
  @Output() public onFileSelected: EventEmitter<File> = new EventEmitter();
  @Output() public onNotification: EventEmitter<{
    severity: 'error' | 'success';
    summary: string;
    detail: string;
  }> = new EventEmitter();

  public layer!: FeatureLayer;

  onLayerUploaded(layer: FeatureLayer): void {
    this.layer = layer;
  }

  onValidated(messages: string[]): void {
    this.validationFinished = true;
    this.onValidationFinished.emit(messages);
  }

  onProgressOfValidation({ validationsCompleted, totalValidations }: {validationsCompleted: number, totalValidations: number}): void {
    this.onValidationProgress.emit({validationsCompleted, totalValidations});
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
}
