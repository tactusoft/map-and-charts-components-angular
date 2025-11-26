import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import Graphic from '@arcgis/core/Graphic.js';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js';
import projectValidations from '../config/projectValidators.json';
import validationsValues from '../config/validationsValues.json';
import urlGeoserviceNumber from '../config/geoServiceUrl.json';
import Polygon from '@arcgis/core/geometry/Polygon';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine.js';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import {
  ContextInfo,
  LayerName,
  POMCALayerName,
  PORHLayerName,
  ProjectName,
  RequiredAttribute,
  ValidationName,
  ValidationResponse,
} from '../types/sirhValidator';

@Component({
  selector: 'shapefile-validator-component',
  templateUrl: './validator.component.html',
})
export class ShapefileValidatorComponent  {
  @Input() public layer!: FeatureLayer;
  @Input() public layerNameToValidate!: POMCALayerName | PORHLayerName;
  @Input() public projectName!: ProjectName;

  @Output() public onValidated: EventEmitter<string[]> = new EventEmitter();
  @Output() public onValidationProgress: EventEmitter<{
    validationsCompleted: number;
    totalValidations: number;
  }> = new EventEmitter();

  public messages: string[] = [];

  constructor() {}

  ngOnChanges(): void {
    this.validateShapefile();
    this.messages = [];
  }

  getValidationsForLayer(): ValidationName[] {
    const layerName =
      this.projectName === 'POMCA' ? 'all' : this.layerNameToValidate;
    return (
      projectValidations[this.projectName] as {
        [key in LayerName<ProjectName>]: ValidationName[];
      }
    )[layerName];
  }

  getRequiredAttributes(
    contextInfo: ContextInfo<ProjectName>
  ): RequiredAttribute[] {
    if (!contextInfo.validationName.includes('attributes')) {
      return [];
    }
    const validationName = contextInfo.validationName.includes('attributes')
      ? 'attributesNames'
      : contextInfo.validationName;

    const requiredAttributesByLayer = (
      validationsValues[contextInfo.projectName] as {
        [key in ValidationName]: number | {[key in LayerName<ProjectName>]: unknown };
      }
    )[validationName];
    const requiredAttributes = (
      requiredAttributesByLayer as {
        [key in LayerName<ProjectName>]: RequiredAttribute[];
      }
    )[contextInfo.layerName];

    return requiredAttributes;
  }

  async validateShapefile() {
    const validationsToApply = this.getValidationsForLayer();
    const validationsFunctions: Function[] = validationsToApply.map(
      (validation) => {
        const functionName = `validate${validation
          .charAt(0)
          .toUpperCase()}${validation.slice(1)}`;
        return (ShapefileValidatorComponent as any)[functionName];
      }
    );

    for (const validation of validationsFunctions) {
      const validationNameUnformatted = validation.name.replace('validate', '');
      const validationName =
        validationNameUnformatted.charAt(0).toLowerCase() +
        validationNameUnformatted.slice(1);

      const result = await validation(this.layer, {
        projectName: this.projectName,
        validationName: validationName as ValidationName,
        layerName: this.layerNameToValidate as LayerName<ProjectName>,
        requiredAttributes: this.getRequiredAttributes({
          projectName: this.projectName,
          validationName: validationName as ValidationName,
          layerName: this.layerNameToValidate as LayerName<ProjectName>,
        }),
      });
      const icon = result.valid ? '✅' : '❌';
      this.messages.push(`${icon} ${result.message}`);
      this.onValidationProgress.emit({validationsCompleted: this.messages.length, totalValidations: validationsFunctions.length});
    }

    this.onValidated.emit(this.messages);
    if (this.shouldFeatureLayerBeUploaded()) this.uploadFeatureLayer(this.layer);
  }

  static validateSpatialReference(
    layer: FeatureLayer,
    contextInfo: ContextInfo<ProjectName>
  ): ValidationResponse {
    const codeEPSG = (
      validationsValues[contextInfo.projectName] as {
        [key in ValidationName]: number | {[key in LayerName<ProjectName>]: unknown };
      }
    )[contextInfo.validationName];
    const valid = layer.spatialReference.wkid === codeEPSG;

    return {
      valid,
      message: valid
        ? 'La capa tiene la proyección correcta'
        : `La capa tiene la proyección ${layer.spatialReference.wkid} en vez de ${codeEPSG}`,
    };
  }

  static validateAttributesNames(
    layer: FeatureLayer,
    contextInfo: ContextInfo<ProjectName>
  ): ValidationResponse {
    const requiredAttributesNames = contextInfo.requiredAttributes?.map(
      (attribute) => attribute.name
    );
    const layerAttributesNames = layer.fields.map((field) => field.name);
    const requiredAttributesMissing: string[] = [];

    requiredAttributesNames?.forEach((attribute: string) => {
      if (!layerAttributesNames.includes(attribute)) {
        requiredAttributesMissing.push(attribute);
      }
    });

    const valid = requiredAttributesMissing.length === 0;

    return {
      valid,
      message: valid
        ? 'La capa tiene los atributos requeridos'
        : `La capa no cuenta con los atributos: ${requiredAttributesMissing.join(
            ', '
          )}`,
    };
  }

  static async validateAttributesEmpty(
    layer: FeatureLayer,
    contextInfo: ContextInfo<ProjectName>
  ): Promise<ValidationResponse> {
    const requiredAttributesNames = contextInfo.requiredAttributes?.map(
      (attribute) => attribute.name
    );
    const layerAttributesNames = layer.fields.map((field) => field.name);
    const areRequiredAttributesInLayer = requiredAttributesNames?.every(attributeName => layerAttributesNames.includes(attributeName));

    if (!areRequiredAttributesInLayer) {
      return {
        valid: false,
        message: `La capa debe contar con los atributos requeridos para validar los valores de los mismos`,
      };
    }

    const emptyAttributesFIDs: string[] = [];

    return layer
      .queryFeatures()
      .then((result) => {
        result.features.forEach((feature: Graphic) => {
          for (const [key, value] of Object.entries(feature.attributes)) {
            if (requiredAttributesNames?.includes(key)) {
              if (value === null || value === undefined || value === '') {
                emptyAttributesFIDs.push(feature.attributes['FID']);
              }
            }
          }
        });

        const valid = emptyAttributesFIDs.length === 0;

        return {
          valid,
          message: valid
            ? 'La capa tiene valores en todos los atributos'
            : `La capa cuenta con vacíos en los atributos de los registros con FID: ${emptyAttributesFIDs.join(
                ','
              )} `,
        };
      })
      .catch((error) => {
        return {
          valid: false,
          message: 'Error al consultar los registros',
        };
      });
  }

  static validateAttributesValues(
    layer: FeatureLayer,
    contextInfo: ContextInfo<ProjectName>
  ): Promise<ValidationResponse> {
    const requiredAttributesNames = contextInfo.requiredAttributes?.map(
      (attribute) => attribute.name
    );
    const wrongAttributesValuesFID: string[] = [];

    return layer
      .queryFeatures()
      .then((result) => {
        result.features.forEach((feature: Graphic) => {
          for (const [key, value] of Object.entries(feature.attributes)) {
            if (requiredAttributesNames?.includes(key)) {
              const requiredAttribute = contextInfo.requiredAttributes?.find(
                (attribute) => attribute.name === key
              );
              if (requiredAttribute) {
                if (requiredAttribute.codedValues) {
                  const codedValues = requiredAttribute.codedValues.map(
                    (codedValue: { code: number; name: string }) =>
                      codedValue.code
                  );
                  if (!codedValues.includes(Number(value))) {
                    wrongAttributesValuesFID.push(
                      `${feature.attributes['OBJECTID']}: Valor incorrecto para el atributo ${key}`
                    );
                  }
                } else {
                  if (
                    requiredAttribute.type.includes('String') &&
                    typeof value !== 'string'
                  ) {
                    wrongAttributesValuesFID.push(
                      `${feature.attributes['OBJECTID']}: Tipo de dato incorrecto para el atributo ${key}`
                    );
                  } else if (
                    requiredAttribute.type.includes('Double') &&
                    typeof value !== 'number'
                  ) {
                    wrongAttributesValuesFID.push(
                      `${feature.attributes['OBJECTID']}: Tipo de dato incorrecto para el atributo ${key}`
                    );
                  } else if (
                    requiredAttribute.type.includes('Integer') &&
                    typeof value !== 'number'
                  ) {
                    wrongAttributesValuesFID.push(
                      `${feature.attributes['OBJECTID']}: Tipo de dato incorrecto para el atributo ${key}`
                    );
                  } else if (
                    requiredAttribute.type.includes('Date') &&
                    !(value instanceof Date)
                  ) {
                    wrongAttributesValuesFID.push(
                      `${feature.attributes['OBJECTID']}: Tipo de dato incorrecto para el atributo ${key}`
                    );
                  }
                }
              }
            }
          }
        });

        const valid = wrongAttributesValuesFID.length === 0;

        return {
          valid,
          message: valid
            ? 'La capa tiene valores correctos en todos los atributos'
            : `La capa cuenta con valores incorrectos en los atributos de los registros con FID: ${wrongAttributesValuesFID.join(
                ','
              )} `,
        };
      })
      .catch((error) => {
        return {
          valid: false,
          message: 'Error al consultar los registros',
        };
      });
  }

  static async validateEmptySpaces(
    layer: FeatureLayer,
    contextInfo: ContextInfo<ProjectName>
  ): Promise<ValidationResponse> {
    return layer
      .queryFeatures()
      .then((result) => {
        const polygons = result.features.map(
          (feature: Graphic) => feature.geometry as Polygon
        );
        const mergedPolygon = geometryEngine.union(polygons) as Polygon;

        const boundingBox = mergedPolygon.extent.expand(1.1);
        const boundingPolygon = Polygon.fromExtent(boundingBox);
        let hasGaps = false;
        const gaps = geometryEngine.difference(
          boundingPolygon,
          mergedPolygon
        ) as Polygon;
        if (gaps.rings.length > 2) {
          const emptySpacesTotalArea = ShapefileValidatorComponent.calculateEmptySpacesArea(gaps.rings);
          hasGaps = emptySpacesTotalArea > 10;
        }

        return {
          valid: !hasGaps,
          message: hasGaps
            ? 'La capa tiene espacios vacíos (huecos) entre los polígonos.'
            : 'La capa no tiene espacios vacíos (huecos) entre los polígonos.',
        };
      })
      .catch((error) => {
        console.error('Error querying features: ', error);
        return {
          valid: false,
          message: `Error querying features: ${error.message}`,
        };
      });
  }

  static async validateMinimumArea(
    layer: FeatureLayer,
    contextInfo: ContextInfo<ProjectName>
  ): Promise<ValidationResponse> {
    return layer
      .queryFeatures()
      .then((result) => {
        const minArea = (
          validationsValues[contextInfo.projectName] as {
            [key in ValidationName]: number | {[key in LayerName<ProjectName>]: unknown };
          }
        )[contextInfo.validationName];

        const polygons = result.features.map(
          (feature: Graphic) => feature.geometry as Polygon
        );
        const polygonsWithoutMinimumArea = polygons.filter(
          (polygon) => ShapefileValidatorComponent.calculateArea(polygon.rings.flat()) < (minArea as number) * 10000
        );

        return {
          valid: polygonsWithoutMinimumArea.length === 0,
          message:
            polygonsWithoutMinimumArea.length === 0
              ? `La capa tiene polígonos con un área mayor o igual a ${minArea} Ha.`
              : `La capa tiene ${polygonsWithoutMinimumArea.length} polígonos con un área menor a ${minArea} Ha.`,
        };
      })
      .catch((error) => {
        return {
          valid: false,
          message: `Error querying features: ${error.message}`,
        };
      });
  }

  static async validateAreaOverlap(
    layer: FeatureLayer,
    contextInfo: ContextInfo<ProjectName>
  ): Promise<ValidationResponse> {
    return layer
      .queryFeatures()
      .then((result) => {
        const polygons = result.features.map(
          (feature: Graphic) => feature.geometry as Polygon
        );
        const mergedPolygon = geometryEngine.union(polygons) as Polygon;

        const boundingBox = mergedPolygon.extent.expand(1.1);
        const boundingPolygon = Polygon.fromExtent(boundingBox);

        const gaps = geometryEngine.difference(
          boundingPolygon,
          mergedPolygon
        ) as Polygon;

        if (layer.spatialReference.isGeographic) {
          return {
            valid: false,
            message: 'La capa debe tener una proyección plana para poder realizar la validación de superposición de áreas.',
          };
        }

        const polygonFromBounds = new Polygon({
          rings: [gaps.rings[1]],
          spatialReference: layer.spatialReference,
        });
        const polygonFromBoundsArea = ShapefileValidatorComponent.calculateArea(polygonFromBounds.rings[0]);
        const polygonsAreaSum = result.features.reduce(
          (sum, polygon) =>
            sum + polygon.attributes.Shape_Area,
          0
        );

        const valid = Math.abs(1 - Math.abs(polygonFromBoundsArea /polygonsAreaSum)) < 0.01;

        return {
          valid,
          message: valid
          ? 'La capa no tiene superposiciones.'
          : 'La capa tiene polígonos que se superponen.'
        };
      })
      .catch((error) => {
        console.error('Error querying features: ', error);
        return {
          valid: false,
          message: `Error querying features: ${error.message}`,
        };
      });
  }

  static async validatePointOverlap(
    layer: FeatureLayer,
    contextInfo: ContextInfo<ProjectName>
  ): Promise<ValidationResponse> {
    return layer
      .queryFeatures()
      .then((result) => {
        const points = result.features.map(
          (feature: Graphic) => feature.geometry as Point
        );
        const overlappingPoints: string[] = [];

        for (let i = 0; i < points.length; i++) {
          for (let j = i + 1; j < points.length; j++) {
            if (points[i].x === points[j].x && points[i].y === points[j].y) {
              overlappingPoints.push(
                `El punto con FID ${result.features[i].attributes['ID']} se superpone con el punto con FID ${result.features[j].attributes['FID']}`
              );
            }
          }
        }

        const hasOverlaps = overlappingPoints.length > 0;

        return {
          valid: !hasOverlaps,
          message: hasOverlaps
            ? `La capa tiene ${overlappingPoints.length} superposiciones de puntos.`
            : 'La capa no tiene puntos que se superponen.',
        };
      })
      .catch((error) => {
        return {
          valid: false,
          message: `Error querying features: ${error.message}`,
        };
      });
  }

  static async validateLineOverlap(
    layer: FeatureLayer,
    contextInfo: ContextInfo<ProjectName>
  ): Promise<ValidationResponse> {
    return layer
      .queryFeatures()
      .then((result) => {
        const lines = result.features.map(
          (feature: Graphic) => feature.geometry as Polyline
        );
        const overlappingLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          for (let j = i + 1; j < lines.length; j++) {
            if (
              geometryEngine.equals(lines[i], lines[j]) ||
              geometryEngine.contains(lines[i], lines[j]) ||
              geometryEngine.contains(lines[j], lines[i])
            ) {
              overlappingLines.push(
                `La línea con FID ${result.features[i].attributes['FID']} se superpone exactamente con la línea con FID ${result.features[j].attributes['FID']}`
              );
            }
          }
        }

        const hasOverlaps = overlappingLines.length > 0;

        return {
          valid: !hasOverlaps,
          message: hasOverlaps
            ? `La capa tiene ${overlappingLines.length} superposiciones exactas de líneas.`
            : 'La capa no tiene líneas que se superponen exactamente.',
        };
      })
      .catch((error) => {
        console.error('Error querying features: ', error);
        return {
          valid: false,
          message: `Error querying features: ${error.message}`,
        };
      });
  }

  static async validateLineIntersections(
    lineLayer: FeatureLayer,
    contextInfo: ContextInfo<ProjectName>
  ): Promise<ValidationResponse> {
    return lineLayer
      .queryFeatures()
      .then((lineResult) => {
        const lines = lineResult.features.map(
          (feature: Graphic) => feature.geometry as Polyline
        );
        const points: Point[] = [];

        lines.forEach((line) => {
          const paths = line.paths[0];
          points.push(
            new Point({
              x: paths[0][0],
              y: paths[0][1],
            })
          );
          points.push(
            new Point({
              x: paths[paths.length - 1][0],
              y: paths[paths.length - 1][1],
            })
          );
        });

        const intersectionsWithoutPoints: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          for (let j = i + 1; j < lines.length; j++) {
            const intersection = geometryEngine.intersectLinesToPoints(
              lines[i],
              lines[j]
            );
            if (intersection.length > 0) {
              const intersectionPoint = intersection[0] as Point;
              const pointExists = points.some((point) =>
                geometryEngine.equals(point, intersectionPoint)
              );
              if (!pointExists) {
                intersectionsWithoutPoints.push(
                  `La intersección entre la línea con FID ${lineResult.features[i].attributes['FID']} y la línea con FID ${lineResult.features[j].attributes['FID']} no tiene un punto en la intersección.`
                );
              }
            }
          }
        }

        const hasIntersectionsWithoutPoints =
          intersectionsWithoutPoints.length > 0;

        return {
          valid: !hasIntersectionsWithoutPoints,
          message: hasIntersectionsWithoutPoints
            ? `La capa tiene ${intersectionsWithoutPoints.length} intersecciones sin puntos.`
            : 'La capa no tiene intersecciones sin puntos.',
        };
      })
      .catch((error) => {
        console.error('Error querying features: ', error);
        return {
          valid: false,
          message: `Error querying features: ${error.message}`,
        };
      });
  }

  static async validateSameAttributeAdjacentPolygons(
    polygonLayer: FeatureLayer,
    attributeName: string,
    contextInfo: ContextInfo<ProjectName>
  ): Promise<ValidationResponse> {
    return polygonLayer
      .queryFeatures()
      .then((polygonResult) => {
        const polygons = polygonResult.features.map((feature: Graphic) => ({
          geometry: feature.geometry as Polygon,
          attributes: feature.attributes,
        }));
        const adjacentPolygonsWithSameAttribute: string[] = [];

        for (let i = 0; i < polygons.length; i++) {
          for (let j = i + 1; j < polygons.length; j++) {
            const areAdjacent = geometryEngine.touches(
              polygons[i].geometry,
              polygons[j].geometry
            );
            if (areAdjacent) {
              const attributeValue1 = polygons[i].attributes[attributeName];
              const attributeValue2 = polygons[j].attributes[attributeName];
              if (attributeValue1 === attributeValue2) {
                adjacentPolygonsWithSameAttribute.push(
                  `Los polígonos con FID ${polygonResult.features[i].attributes['FID']} y FID ${polygonResult.features[j].attributes['FID']} son adyacentes y tienen el mismo valor de atributo ${attributeName}.`
                );
              }
            }
          }
        }

        const hasAdjacentPolygonsWithSameAttribute =
          adjacentPolygonsWithSameAttribute.length > 0;

        return {
          valid: !hasAdjacentPolygonsWithSameAttribute,
          message: hasAdjacentPolygonsWithSameAttribute
            ? `La capa tiene ${adjacentPolygonsWithSameAttribute.length} pares de polígonos adyacentes con el mismo valor de atributo.`
            : 'La capa no tiene polígonos adyacentes con el mismo valor de atributo.',
        };
      })
      .catch((error) => {
        console.error('Error querying features: ', error);
        return {
          valid: false,
          message: `Error querying features: ${error.message}`,
        };
      });
  }

  async uploadFeatureLayer(featureLayer: FeatureLayer): Promise<void> {
    const url = this.getGeoservicesUrl();
    const result = await featureLayer.queryFeatures();
    const features = result.features.map((feature: Graphic) => {
      return new Graphic({
        geometry: feature.geometry,
        attributes: feature.attributes
      });
    });

    try {
      const featureLayer = new FeatureLayer({
        url
      });

      const edits = {
        addFeatures: features
      };

      const result = await featureLayer.applyEdits(edits);

      if (result.addFeatureResults.length > 0) {
        console.log('Features successfully uploaded.');
      } else {
        console.error('Failed to upload features.');
      }
    } catch (error) {
      console.error('Error uploading features: ', error);
    }
  }

  getGeoservicesUrl(): string {
    const baseUrl = 'https://services6.arcgis.com/hxAwRYAu9QHliJ8T/arcgis/rest/services/SIRH/FeatureServer/';
    const geoServiceNumber = urlGeoserviceNumber[this.layerNameToValidate as keyof typeof urlGeoserviceNumber];
    return baseUrl + geoServiceNumber;
  }

  shouldFeatureLayerBeUploaded(): boolean {
    if (this.projectName === 'POMCA') {
      return !this.messages.some((validation, index) => index !== 1 && index !== 2 && validation.includes('❌'));
    } else if (this.projectName === 'PORH') {
      return !this.messages.some(validation => validation.includes('❌'));
    }
    return false;
  }

  static calculateArea(points: number[][]): number {
    const n = points.length;
    if (n < 3) return 0;

    let area = 0;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % n];
      area += x1 * y2 - x2 * y1;
    }

    return Math.abs(area) / 2;
  }
  static calculateEmptySpacesArea(coordinatesCollection: number[][][]) {
    const cooordinatesCollectionWithoutFirstTwo = coordinatesCollection.slice(2);
    let totalArea = 0;
    for (const coordinates of cooordinatesCollectionWithoutFirstTwo) {
      const area = this.calculateArea(coordinates);
      totalArea += area;
    }

    return totalArea;
  }
}
