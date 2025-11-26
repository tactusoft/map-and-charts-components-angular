import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SharedMapService } from '../../services/shared-map.service';
import { HttpClient } from '@angular/common/http';
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

declare const galleryConfigData: any;

@Component({
  selector: 'gallery-component',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss']
})
export class GalleryComponent implements AfterViewInit, OnDestroy {
  loading: boolean = false;

  mapServices: any[] = [];
  results: any[] = [];
  keyValue: string = '';

  constructor(private mapService: SharedMapService, private router: Router, private http: HttpClient) {

  }

  ngAfterViewInit() {
    if (typeof galleryConfigData !== 'undefined') {
      this.mapServices = galleryConfigData;
    } else {
      this.http.get('assets/config.gallery.json').subscribe((data: any) => {
        this.mapServices = data as any[];
      });
    }
  }

  ngOnDestroy() {

  }

  onSearchClick(): void {
    if (this.keyValue) {
      this.results = this.searchItems(this.keyValue);
    } else {

    }
  }

  onChangeKeyFormControl(event: Event) {
    this.keyValue = (event.target as HTMLInputElement).value;
  }

  searchItems(query: string) {
    query = query.toLowerCase();
    return this.mapServices.filter((item: any) => {
      const title = item.title.toLowerCase();
      const tags = item.tags.map((tag: string) => tag.toLowerCase());
      return title.includes(query) || tags.some((tag: string) => tag.includes(query));
    });
  }

  calciteListItemSelect(event: Event) {
    const id = (event.target as HTMLInputElement).id;
    const item = this.mapServices.filter((service) => service.id === id)[0];
    const filterLayer = this.mapService.view?.map?.findLayerById('FeatureLayer_' + item.id);
    if (!filterLayer) {
      const layer = new FeatureLayer({
        id: 'FeatureLayer_' + item.id,
        title: item.title,
        url: item.service.url
      });
      this.mapService.view?.map?.add(layer);
    }
  }
}
