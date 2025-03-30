import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { WINDOW, WINDOW_PROVIDERS } from 'src/services/window.service';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { CommonModule } from '@angular/common';
import { BaseHrefService } from 'src/services/base-href.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, CommonModule],
      providers: [
        HttpClient, WINDOW_PROVIDERS,
        BaseHrefService,
        provideHttpClient(),
        provideOAuthClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
