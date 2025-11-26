export type ValidationResponse = {
  valid: boolean;
  message: string;
};

export type ProjectName = 'POMCA' | 'PORH';

export type PORHLayerName =
  | 'uniformAreas'
  | 'sections'
  | 'monitoringNetwork'
  | 'WTP'
  | 'transfers'
  | 'otherInfrastructure';

export type POMCALayerName =
  | 'all'
  | 'floodingThreat'
  | 'rainfallThreat'
  | 'landslidesThreat'
  | 'floodingRisk'
  | 'rainfallRisk'
  | 'landslidesRisk'
  | 'environmentalZonification'
  | 'subbasin';

export type ProjectLayerMapping = {
  POMCA: POMCALayerName;
  PORH: PORHLayerName;
};

export type LayerName<T extends ProjectName> = T extends keyof ProjectLayerMapping
  ? ProjectLayerMapping[T]
  : never;

export type ValidationName =
  | 'spatialReference'
  | 'attributesNames'
  | 'areaOverlap'
  | 'emptySpaces'
  | 'attributesEmpty'
  | 'minimumArea'
  | 'sameAttributeAdjacentPolygons'
  | 'attributesValues'
  | 'pointOverlap'
  | 'lineOverlap'
  | 'lineIntersections';

export type ContextInfo<T extends ProjectName> = {
  projectName: T;
  validationName: ValidationName;
  layerName: LayerName<T>;
  requiredAttributes?: any[];
};

export type RequiredAttribute = {
  type: string;
  name: string;
  alias: string;
  sqlType: string;
  length: number;
  nullable: boolean;
  editable: boolean;
  codedValues?: { code: number; name: string }[];
};

export type EsriLayerIds = {
  shapefileId: string;
  featureId: string;
}
