import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

declare const configData: any;

@Injectable({ providedIn: 'root' })
export class ConfigService {
    private configSubject = new BehaviorSubject<any>(null);
    config$ = this.configSubject.asObservable();

    constructor(private http: HttpClient) {
        this.loadConfig();
    }

    private loadConfig() {
        if (typeof configData !== 'undefined') {
            this.configSubject.next(configData);
        } else {
            this.http.get(environment.configUrl).subscribe({
                next: (config) => this.configSubject.next(config),
                error: (error) => console.error('Error loading config:', error)
            });
        }
    }

    get configData() {
        return this.configSubject.getValue();
    }
}
