import { Route } from '@angular/router';
import { RaceHistoryComponent } from './app/components/race-history/race-history.component';

export const ROUTES: Route[] = [
  { path: '', component: RaceHistoryComponent },
  { path: 'race-history', redirectTo: '', pathMatch: 'full' },
  { path: '**', redirectTo: '' } // Wildcard route for unmatched paths
];