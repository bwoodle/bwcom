import { Route } from '@angular/router';
import { RaceHistoryComponent } from './app/components/race-history/race-history.component';

export const ROUTES: Route[] = [
  { path: '', redirectTo: '/race-history', pathMatch: 'full' },
  { path: 'race-history', component: RaceHistoryComponent },
  { path: '**', redirectTo: '/race-history' } // Wildcard route for unmatched paths
];