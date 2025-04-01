import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { map, Observable } from 'rxjs';
import { VersionService } from './services/version.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet, CommonModule]
})
export class AppComponent {
  private oAuthService = inject(OAuthService);
  private versionService = inject(VersionService);
  public version: Observable<string>;
  public environment: Observable<string>;

  constructor() {
    this.oAuthService.configure(authConfig);
    this.oAuthService.loadDiscoveryDocumentAndTryLogin();
    const v = this.versionService.getVersion();
    this.version = v.pipe(map(v => v.version));
    this.environment = v.pipe(map(v => v.environment));
  }
}

const authConfig: AuthConfig = {
  issuer: 'https://accounts.google.com',
  redirectUri: window.location.origin,
  clientId: '321345183214-bdlfi5tb382p40j8jh7uefsmblam6b1h.apps.googleusercontent.com',
  responseType: 'id_token token',
  scope: 'openid profile email',
  showDebugInformation: true,
  strictDiscoveryDocumentValidation: false
};