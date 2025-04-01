import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { VersionResponse } from 'src/models/version-response';
import { VersionService } from 'src/services/version.service';

@Component({
  selector: 'app-race-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './race-history.component.html',
  styleUrl: './race-history.component.scss'
})
export class RaceHistoryComponent {
  public version: Observable<string>;
  public environment: Observable<string>;

  constructor() {
    const versionService = inject(VersionService);
    const v = versionService.getVersion();
    this.version = v.pipe(map(v => v.version));
    this.environment = v.pipe(map(v => v.environment));
  }
}
