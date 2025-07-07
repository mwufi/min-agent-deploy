import { SiteBehavior } from './base';
import { GoogleDocsBehavior } from './google-docs';

export function createSiteBehavior(hostname: string): SiteBehavior | null {
  switch (hostname) {
    case 'docs.google.com':
      return new GoogleDocsBehavior();
    // Add more sites here as needed
    // case 'sheets.google.com':
    //   return new GoogleSheetsBehavior();
    default:
      return null;
  }
}

export type { SiteBehavior } from './base';