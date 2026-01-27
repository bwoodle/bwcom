import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { map, Observable } from 'rxjs';
import { VersionService } from './services/version.service';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { LoginComponent } from './components/login/login.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet, LoginComponent, CommonModule]
})
export class AppComponent {
  private oAuthService = inject(OAuthService);
  private versionService = inject(VersionService);
  public version: Observable<string>;
  public environment: Observable<string>;

  constructor() {
    const v = this.versionService.getVersion();
    this.version = v.pipe(map(v => v.version));
    this.environment = v.pipe(map(v => v.environment));
    this.oAuthService.configure(authConfig);
    this.oAuthService.loadDiscoveryDocumentAndTryLogin();
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