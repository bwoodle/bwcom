import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'
import { map, Observable } from 'rxjs';
import { VersionResponse } from 'src/models/version-response';
import { BaseHrefService } from './base-href.service';

@Injectable({
  providedIn: 'root'
})
export class VersionService {
  constructor(private http: HttpClient, private baseHrefService: BaseHrefService) { }

  public getVersion(): Observable<VersionResponse> {
    return this.http.get<VersionResponse>(this.baseHrefService.baseHref + "/version");
  }

}