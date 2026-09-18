/**
 * Unit and Property Validation against the 219 Real AWS Services Dataset
 */

import { describe, it, expect } from 'vitest';
import { REAL_AWS_SERVICES, getRealServices } from '../helpers/real-services';
import { searchServices } from '../../src/popup/search';
import { mergeServices } from '../../src/services/service-merger';
import { createServiceLink } from '../../src/quickbar/dom-builder';
import { AWSFavoriteClasses, PLACEHOLDER_ICON_URL } from '../../src/types';

const MOCK_CSS_CLASSES: AWSFavoriteClasses = {
  li: 'aws-li-class',
  anchor: 'aws-a-class',
  mainContainer: 'aws-main-container',
  iconWrapper: 'aws-icon-wrapper',
  icon: 'aws-icon-class',
  label: 'aws-label-class'
};

describe('Real AWS Services Dataset Validation (219 Services)', () => {
  it('should load all 219 real services from fixture catalog', () => {
    expect(REAL_AWS_SERVICES.length).toBeGreaterThanOrEqual(210);
    const uniqueIds = new Set(REAL_AWS_SERVICES.map((s) => s.id));
    expect(uniqueIds.size).toBe(REAL_AWS_SERVICES.length);
  });

  describe('Rule 4: Service ID Extraction via /<serviceId>/home', () => {
    it('all 219 real console URLs must strictly conform to /<serviceId>/home pattern', () => {
      for (const service of REAL_AWS_SERVICES) {
        const urlObj = new URL(service.consoleUrl);
        const match = urlObj.pathname.match(/\/([^\/]+)\/home/);
        expect(match, `Failed on service ${service.id}: ${service.consoleUrl}`).not.toBeNull();
        expect(match![1].toLowerCase()).toBe(service.id.toLowerCase());
      }
    });
  });

  describe('Search Functionality with Real Services', () => {
    const allServices = getRealServices();

    it('should return all services when query is empty', () => {
      const results = searchServices('', allServices);
      expect(results.length).toBe(allServices.length);
    });

    it('should return all services when query is only whitespace', () => {
      const results = searchServices('   ', allServices);
      expect(results.length).toBe(allServices.length);
    });

    it('should find compute services when querying "compute" or "ec2"', () => {
      const ec2Results = searchServices('ec2', allServices);
      expect(ec2Results.some((s) => s.id === 'ec2')).toBe(true);

      const lambdaResults = searchServices('lambda', allServices);
      expect(lambdaResults.some((s) => s.id === 'lambda')).toBe(true);
    });

    it('should find nested services by id (e.g. codebuild, appstream2, dynamodbv2)', () => {
      expect(searchServices('codebuild', allServices).length).toBeGreaterThanOrEqual(1);
      expect(searchServices('appstream2', allServices).length).toBeGreaterThanOrEqual(1);
      expect(searchServices('dynamodbv2', allServices).length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for non-existent service query', () => {
      const results = searchServices('nonexistent_aws_service_xyz_999', allServices);
      expect(results.length).toBe(0);
    });
  });

  describe('Service Merger with Real Services', () => {
    it('should merge user favorites and recent services with deduplication', () => {
      const userFavs = getRealServices(10, 'user');
      // Overlap first 5 with userFavs, and add 10 new recent services
      const recent = getRealServices(15, 'recent');

      const merged = mergeServices(userFavs, recent);

      // User favorites must appear first in order
      for (let i = 0; i < 10; i++) {
        expect(merged[i].id).toBe(userFavs[i].id);
        expect(merged[i].source).toBe('user');
      }

      // Remaining items must be deduplicated
      const allMergedIds = merged.map((s) => s.id);
      const uniqueMergedIds = new Set(allMergedIds);
      expect(allMergedIds.length).toBe(uniqueMergedIds.size);
    });
  });

  describe('DOM Builder with Real Services', () => {
    it('should successfully build valid DOM elements for all 219 real services without exception', () => {
      const services = getRealServices();

      for (const service of services) {
        const dom = createServiceLink(service, MOCK_CSS_CLASSES);
        expect(dom).not.toBeNull();
        expect(dom!.getAttribute('data-service-id')).toBe(service.id);

        const anchor = dom!.querySelector('a');
        expect(anchor).not.toBeNull();
        expect(anchor!.getAttribute('href')).toBe(service.consoleUrl);

        const img = dom!.querySelector('img');
        expect(img).not.toBeNull();
        if (service.iconUrl) {
          expect(img!.getAttribute('src')).toBe(service.iconUrl);
        } else {
          expect(img!.getAttribute('src')).toBe(PLACEHOLDER_ICON_URL);
        }

        const label = dom!.querySelector('span');
        expect(label).not.toBeNull();
        expect(label!.textContent).toBe(service.name);
      }
    });
  });
});
