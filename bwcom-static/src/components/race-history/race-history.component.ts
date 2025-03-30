import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HelloWorldService } from 'src/services/hello-world.service';

@Component({
  selector: 'app-race-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './race-history.component.html',
  styleUrl: './race-history.component.scss'
})
export class RaceHistoryComponent {
  public hello: Observable<string>;

  constructor() {
    const helloWorldService = inject(HelloWorldService);
    this.hello = helloWorldService.getHello();
  }
}
