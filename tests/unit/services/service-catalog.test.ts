import { describe, it, expect } from 'vitest';
import {
  formatServiceName,
  getCatalogServices,
  getUnifiedSearchPool
} from '../../../src/services/service-catalog';
import { Service } from '../../../src/types';

describe('service-catalog', () => {
  describe('formatServiceName', () => {
    it('should format known AWS acronyms properly', () => {
      expect(formatServiceName('s3')).toBe('S3');
      expect(formatServiceName('ec2')).toBe('EC2');
      expect(formatServiceName('iam')).toBe('IAM');
      expect(formatServiceName('rds')).toBe('RDS');
      expect(formatServiceName('dynamodbv2')).toBe('DynamoDB');
      expect(formatServiceName('bedrock')).toBe('Amazon Bedrock');
    });

    it('should format kebab-case and snake_case strings into title case', () => {
      expect(formatServiceName('chime-sdk')).toBe('Chime Sdk');
      expect(formatServiceName('connect_health')).toBe('Connect Health');
      expect(formatServiceName('lookoutequipment')).toBe('Lookoutequipment');
    });

    it('should handle empty string gracefully', () => {
      expect(formatServiceName('')).toBe('');
    });
  });

  describe('getCatalogServices', () => {
    it('should return all 220+ AWS baseline services', () => {
      const services = getCatalogServices();
      expect(services.length).toBeGreaterThan(200);

      const s3 = services.find((s) => s.id === 's3');
      expect(s3).toBeDefined();
      expect(s3?.name).toBe('S3');
      expect(s3?.consoleUrl).toBe('https://console.aws.amazon.com/s3/home');
      expect(s3?.iconUrl).toContain('.svg');
    });

    it('should return cached array on subsequent calls', () => {
      const first = getCatalogServices();
      const second = getCatalogServices();
      expect(first).toBe(second);
    });

    it('should configure versioned console URLs for services like route53, connect, sns, and cloudfront', () => {
      const services = getCatalogServices();
      const route53 = services.find((s) => s.id === 'route53');
      expect(route53).toBeDefined();
      expect(route53?.name).toBe('Route 53');
      expect(route53?.consoleUrl).toBe('https://console.aws.amazon.com/route53/v2/home');

      const connect = services.find((s) => s.id === 'connect');
      expect(connect).toBeDefined();
      expect(connect?.consoleUrl).toBe('https://console.aws.amazon.com/connect/v2/home');

      const sns = services.find((s) => s.id === 'sns');
      expect(sns).toBeDefined();
      expect(sns?.consoleUrl).toBe('https://console.aws.amazon.com/sns/v3/home');

      const cloudfront = services.find((s) => s.id === 'cloudfront');
      expect(cloudfront).toBeDefined();
      expect(cloudfront?.consoleUrl).toBe('https://console.aws.amazon.com/cloudfront/v4/home');
    });
  });

  describe('getUnifiedSearchPool', () => {
    it('should prioritize base services over catalog services for same ID', () => {
      const base: Service[] = [
        {
          id: 's3',
          name: 'Amazon Simple Storage Service (Live)',
          iconUrl: 'https://cdn.example.com/custom-s3.svg',
          consoleUrl: 'https://us-east-1.console.aws.amazon.com/s3/home?region=us-east-1'
        }
      ];

      const pool = getUnifiedSearchPool(base);
      const s3 = pool.find((s) => s.id === 's3');
      expect(s3?.name).toBe('Amazon Simple Storage Service (Live)');
      expect(s3?.consoleUrl).toBe(
        'https://us-east-1.console.aws.amazon.com/s3/home?region=us-east-1'
      );
    });

    it('should include services from both base and catalog without duplicates', () => {
      const base: Service[] = [
        {
          id: 'custom-svc',
          name: 'Custom Service',
          iconUrl: null,
          consoleUrl: 'https://console.aws.amazon.com/custom-svc/home'
        }
      ];

      const pool = getUnifiedSearchPool(base);
      expect(pool.some((s) => s.id === 'custom-svc')).toBe(true);
      expect(pool.some((s) => s.id === 's3')).toBe(true);
      expect(pool.some((s) => s.id === 'bedrock')).toBe(true);

      const s3Count = pool.filter((s) => s.id.toLowerCase() === 's3').length;
      expect(s3Count).toBe(1);
    });
  });
});
