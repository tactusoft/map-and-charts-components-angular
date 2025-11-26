import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SharedMapService } from './shared-map.service';
import * as geoprocessor from "@arcgis/core/rest/geoprocessor";
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TokenService {

    token: string = '';

    constructor(private sharedMapService: SharedMapService) { }

    getArcgisToken(): Observable<any> {
        const referer = this.sharedMapService.config.referer;
        const gpUrl = `${environment.utilsUrl}/TokenTool/GPServer/Generar%20Token`; // ArcGIS lo fuerza a "Tool"

        const params = {
            referer: referer,
        };

        // Convertimos la promesa en un Observable
        return from(geoprocessor.execute(gpUrl, params)).pipe(
            map(response => {
                // Verifica si la respuesta tiene el token esperado
                if (response.results && response.results.length > 0) {
                    return response.results[0].value;
                } else {
                    throw new Error("No se pudo obtener el token");
                }
            }),
            catchError(error => throwError(() => new Error(`Error obteniendo el token: ${error.message}`)))
        );
    }
}
