import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { filter } from 'rxjs';

const MODULES: any[] = [CommonModule, MatFormFieldModule, FormsModule, ReactiveFormsModule];

@Component({
  selector: 'bw-login',
  standalone: true,
  imports: [MODULES],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private oAuthService = inject(OAuthService);
  public profile = "";

  constructor(private oauthService: OAuthService) {
    const authConfig: AuthConfig = {
      issuer: 'https://accounts.google.com',
      redirectUri: window.location.origin,
      clientId: '321345183214-bdlfi5tb382p40j8jh7uefsmblam6b1h.apps.googleusercontent.com',
      responseType: 'code',
      scope: 'openid profile email',
      showDebugInformation: true,
      strictDiscoveryDocumentValidation: false
    };
    this.oAuthService.configure(authConfig);

    // Automatically load user profile
    this.oauthService.events
      .pipe(filter((e) => e.type === 'token_received'))
      .subscribe((_) => this.oauthService.loadUserProfile());
  }

  get email(): string {
    const claims = this.oauthService.getIdentityClaims();
    if (!claims) return '';
    return claims['email'];
  }

  get idToken(): string {
    return this.oauthService.getIdToken();
  }

  get accessToken(): string {
    return this.oauthService.getAccessToken();
  }

  login() {
    this.oauthService.loadDiscoveryDocumentAndLogin();
  }

  logout() {
    this.oauthService.logOut();
  }

  refresh() {
    this.oauthService.refreshToken();
  }
}