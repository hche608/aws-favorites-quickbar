import { describe, it, expect } from 'vitest';
import { searchServices, ensureFavoritesInList } from '../../../src/popup/search';
import { getCatalogServices } from '../../../src/services/service-catalog';
import { Service } from '../../../src/types';

describe('Popup Search with Catalog', () => {
  const baseServices: Service[] = [
    {
      id: 's3',
      name: 'S3',
      iconUrl: 'https://example.com/s3.svg',
      consoleUrl: 'https://console.aws.amazon.com/s3/home'
    },
    {
      id: 'ec2',
      name: 'EC2',
      iconUrl: 'https://example.com/ec2.svg',
      consoleUrl: 'https://console.aws.amazon.com/ec2/home'
    }
  ];

  describe('searchServices with catalogServices', () => {
    it('should return base services when query is empty, even if catalog is provided', () => {
      const results = searchServices('', baseServices, getCatalogServices());
      expect(results).toEqual(baseServices);
    });

    it('should find unvisited catalog service by name or ID when query is non-empty', () => {
      const results = searchServices('bedrock', baseServices, getCatalogServices());
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((s) => s.id === 'bedrock')).toBe(true);
    });

    it('should prioritize live base service over catalog service for same ID', () => {
      const results = searchServices('s3', baseServices, getCatalogServices());
      expect(results.length).toBe(1);
      expect(results[0].iconUrl).toBe('https://example.com/s3.svg');
    });

    it('should find services by case-insensitive partial match', () => {
      const results = searchServices('KINE', baseServices, getCatalogServices());
      expect(results.some((s) => s.id.includes('kinesis'))).toBe(true);
    });
  });

  describe('ensureFavoritesInList', () => {
    it('should keep existing base services and append missing favorite from catalog', () => {
      const favorites = ['s3', 'bedrock'];
      const enriched = ensureFavoritesInList(baseServices, favorites);

      expect(enriched.length).toBe(3);
      expect(enriched.some((s) => s.id === 's3')).toBe(true);
      expect(enriched.some((s) => s.id === 'ec2')).toBe(true);

      const bedrock = enriched.find((s) => s.id === 'bedrock');
      expect(bedrock).toBeDefined();
      expect(bedrock?.name).toBe('Amazon Bedrock');
      expect(bedrock?.source).toBe('user');
    });

    it('should not duplicate favorites that already exist in base services', () => {
      const favorites = ['s3', 'ec2'];
      const enriched = ensureFavoritesInList(baseServices, favorites);
      expect(enriched.length).toBe(2);
    });

    it('should handle empty base services and synthesize all favorites', () => {
      const favorites = ['iam', 'lambda'];
      const enriched = ensureFavoritesInList([], favorites);
      expect(enriched.length).toBe(2);
      expect(enriched.some((s) => s.id === 'iam')).toBe(true);
      expect(enriched.some((s) => s.id === 'lambda')).toBe(true);
    });
  });
});
