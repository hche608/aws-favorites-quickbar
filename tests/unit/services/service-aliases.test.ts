import { describe, it, expect } from 'vitest';
import { parseServiceIdFromUrl } from '../../../src/utils/dom';
import { formatServiceName } from '../../../src/services/service-catalog';
import { getDefaultIconUrl } from '../../../src/services/service-icons';
import { mergeServices } from '../../../src/services/service-merger';
import { normalizeServiceId } from '../../../src/services/service-aliases';
import { Service } from '../../../src/types';

describe('AWS Service Aliases & Canonical Support', () => {
  describe('normalizeServiceId', () => {
    it('should map micro-frontend and versioned routes to canonical IDs', () => {
      expect(normalizeServiceId('vpcconsole')).toBe('vpc');
      expect(normalizeServiceId('iamv2')).toBe('iam');
      expect(normalizeServiceId('wafv2')).toBe('wafv2-pro');
      expect(normalizeServiceId('waf')).toBe('wafv2-pro');
      expect(normalizeServiceId('appstream')).toBe('appstream2');
    });

    it('should map brand names and shorthand aliases to internal catalog IDs', () => {
      expect(normalizeServiceId('stepfunctions')).toBe('states');
      expect(normalizeServiceId('opensearch')).toBe('aos');
      expect(normalizeServiceId('es')).toBe('aos');
      expect(normalizeServiceId('identitycenter')).toBe('singlesignon');
      expect(normalizeServiceId('billing')).toBe('costmanagement');
      expect(normalizeServiceId('certificate-manager')).toBe('acm');
      expect(normalizeServiceId('beanstalk')).toBe('elasticbeanstalk');
      expect(normalizeServiceId('ssm')).toBe('systems-manager');
      expect(normalizeServiceId('eventbridge')).toBe('events');
      expect(normalizeServiceId('quicksight')).toBe('qs');
      expect(normalizeServiceId('documentdb')).toBe('docdb');
    });

    it('should leave standard service IDs unchanged', () => {
      expect(normalizeServiceId('ec2')).toBe('ec2');
      expect(normalizeServiceId('s3')).toBe('s3');
      expect(normalizeServiceId('dynamodb')).toBe('dynamodb');
      expect(normalizeServiceId('dynamodbv2')).toBe('dynamodbv2');
      expect(normalizeServiceId('')).toBe('');
      expect(normalizeServiceId(null as any)).toBe('');
    });
  });

  describe('parseServiceIdFromUrl with aliases', () => {
    it('should extract canonical IDs from various AWS console URL patterns', () => {
      expect(
        parseServiceIdFromUrl('https://us-east-1.console.aws.amazon.com/vpcconsole/home')
      ).toBe('vpc');
      expect(
        parseServiceIdFromUrl('https://us-east-1.console.aws.amazon.com/iamv2/home#/users')
      ).toBe('iam');
      expect(parseServiceIdFromUrl('https://us-east-1.console.aws.amazon.com/wafv2/home')).toBe(
        'wafv2-pro'
      );
      expect(
        parseServiceIdFromUrl('https://us-east-1.console.aws.amazon.com/stepfunctions/home')
      ).toBe('states');
      expect(
        parseServiceIdFromUrl('https://us-east-1.console.aws.amazon.com/opensearch/home')
      ).toBe('aos');
      expect(parseServiceIdFromUrl('https://us-east-1.console.aws.amazon.com/es/home')).toBe('aos');
      expect(
        parseServiceIdFromUrl('https://us-east-1.console.aws.amazon.com/identitycenter/home')
      ).toBe('singlesignon');
      expect(parseServiceIdFromUrl('https://console.aws.amazon.com/billing/home')).toBe(
        'costmanagement'
      );
      expect(parseServiceIdFromUrl('https://console.aws.amazon.com/certificate-manager/home')).toBe(
        'acm'
      );
      expect(parseServiceIdFromUrl('https://console.aws.amazon.com/beanstalk/home')).toBe(
        'elasticbeanstalk'
      );
      expect(parseServiceIdFromUrl('https://console.aws.amazon.com/ssm/home')).toBe(
        'systems-manager'
      );
      expect(parseServiceIdFromUrl('https://console.aws.amazon.com/eventbridge/home')).toBe(
        'events'
      );
      expect(parseServiceIdFromUrl('https://console.aws.amazon.com/documentdb/home')).toBe('docdb');
    });
  });

  describe('Default Icon Resolution with Aliases', () => {
    it('should resolve icons for aliases matching canonical target icons', () => {
      const aliases = [
        ['vpcconsole', 'vpc'],
        ['iamv2', 'iam'],
        ['wafv2', 'wafv2-pro'],
        ['waf', 'wafv2-pro'],
        ['stepfunctions', 'states'],
        ['opensearch', 'aos'],
        ['es', 'aos'],
        ['identitycenter', 'singlesignon'],
        ['billing', 'costmanagement'],
        ['certificate-manager', 'acm'],
        ['beanstalk', 'elasticbeanstalk'],
        ['ssm', 'systems-manager'],
        ['eventbridge', 'events'],
        ['quicksight', 'qs'],
        ['documentdb', 'docdb'],
        ['appstream', 'appstream2']
      ];

      for (const [alias, canonical] of aliases) {
        const canonicalIcon = getDefaultIconUrl(canonical);
        const aliasIcon = getDefaultIconUrl(alias);
        expect(canonicalIcon).not.toBeNull();
        expect(canonicalIcon).toContain('.svg');
        expect(aliasIcon).toBe(canonicalIcon);
      }
    });
  });

  describe('Display Name Formatting with Aliases', () => {
    it('should properly format branding for known alias pairs', () => {
      expect(formatServiceName('states')).toBe('Step Functions');
      expect(formatServiceName('stepfunctions')).toBe('Step Functions');
      expect(formatServiceName('aos')).toBe('OpenSearch');
      expect(formatServiceName('opensearch')).toBe('OpenSearch');
      expect(formatServiceName('es')).toBe('OpenSearch');
      expect(formatServiceName('singlesignon')).toBe('IAM Identity Center');
      expect(formatServiceName('identitycenter')).toBe('IAM Identity Center');
      expect(formatServiceName('wafv2-pro')).toBe('WAF & Shield');
      expect(formatServiceName('wafv2')).toBe('WAF');
      expect(formatServiceName('waf')).toBe('WAF');
      expect(formatServiceName('dynamodbv2')).toBe('DynamoDB');
      expect(formatServiceName('dynamodb')).toBe('DynamoDB');
      expect(formatServiceName('redshiftv2')).toBe('Amazon Redshift');
      expect(formatServiceName('redshift')).toBe('Amazon Redshift');
      expect(formatServiceName('systems-manager')).toBe('Systems Manager');
      expect(formatServiceName('ssm')).toBe('Systems Manager');
      expect(formatServiceName('events')).toBe('EventBridge');
      expect(formatServiceName('eventbridge')).toBe('EventBridge');
      expect(formatServiceName('docdb')).toBe('DocumentDB');
      expect(formatServiceName('documentdb')).toBe('DocumentDB');
      expect(formatServiceName('qs')).toBe('QuickSight');
      expect(formatServiceName('quicksight')).toBe('QuickSight');
      expect(formatServiceName('appstream2')).toBe('AppStream 2.0');
      expect(formatServiceName('appstream')).toBe('AppStream 2.0');
    });
  });

  describe('Deduplication of Aliases in mergeServices', () => {
    it('should deduplicate services sharing the same canonical ID', () => {
      const userFavorites: Service[] = [
        {
          id: 'iam',
          name: 'IAM',
          iconUrl: 'https://cdn.example.com/iam.svg',
          consoleUrl: 'https://console.aws.amazon.com/iam/home',
          source: 'user'
        },
        {
          id: 'states',
          name: 'Step Functions',
          iconUrl: 'https://cdn.example.com/states.svg',
          consoleUrl: 'https://console.aws.amazon.com/states/home',
          source: 'user'
        }
      ];

      const recentServices: Service[] = [
        {
          id: 'iamv2',
          name: 'IAM',
          iconUrl: 'https://cdn.example.com/iam.svg',
          consoleUrl: 'https://console.aws.amazon.com/iamv2/home',
          source: 'recent'
        },
        {
          id: 'stepfunctions',
          name: 'Step Functions',
          iconUrl: 'https://cdn.example.com/states.svg',
          consoleUrl: 'https://console.aws.amazon.com/stepfunctions/home',
          source: 'recent'
        },
        {
          id: 's3',
          name: 'S3',
          iconUrl: 'https://cdn.example.com/s3.svg',
          consoleUrl: 'https://console.aws.amazon.com/s3/home',
          source: 'recent'
        }
      ];

      const merged = mergeServices(userFavorites, recentServices);
      expect(merged).toHaveLength(3);
      expect(merged.map((s) => s.id)).toEqual(['iam', 'states', 's3']);
    });
  });
});
