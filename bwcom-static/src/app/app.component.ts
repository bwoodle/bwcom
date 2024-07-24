import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api/api.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public hello: Observable<string>;

  constructor(apiService: ApiService) {
    this.hello = apiService.getHello();
  }


}
