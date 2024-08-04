import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HelloWorldService } from '../services/hello-world.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public hello: Observable<string>;

  constructor(helloWorldService: HelloWorldService) {
    this.hello = helloWorldService.getHello();
  }
}
