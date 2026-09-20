/**
 * AWS Service Catalog
 *
 * Provides a comprehensive catalog of 220+ AWS services derived from default icons,
 * with well-formatted display names and unified search pool generation.
 */

import { Service } from '../types';
import defaultIcons from './default-icons.json';

const DEFAULT_ICON_MAP: Record<string, string> = defaultIcons as Record<string, string>;

/**
 * Common AWS abbreviations and proper brandings for known service IDs.
 */
const KNOWN_SERVICE_NAMES: Record<string, string> = {
  s3: 'S3',
  ec2: 'EC2',
  iam: 'IAM',
  rds: 'RDS',
  sns: 'SNS',
  sqs: 'SQS',
  ses: 'SES',
  vpc: 'VPC',
  eks: 'EKS',
  ecs: 'ECS',
  kms: 'KMS',
  waf: 'WAF',
  dynamodbv2: 'DynamoDB',
  dynamodb: 'DynamoDB',
  route53: 'Route 53',
  cloudwatch: 'CloudWatch',
  cloudformation: 'CloudFormation',
  cloudfront: 'CloudFront',
  cognito: 'Cognito',
  apigateway: 'API Gateway',
  codebuild: 'CodeBuild',
  codepipeline: 'CodePipeline',
  codecommit: 'CodeCommit',
  bedrock: 'Amazon Bedrock'
};

/**
 * Formats a canonical service ID into a clean display name.
 *
 * @param id - Canonical service identifier
 * @returns Human-readable service name
 */
export function formatServiceName(id: string): string {
  if (!id) {
    return '';
  }
  const lower = id.toLowerCase();
  const known = KNOWN_SERVICE_NAMES[lower];
  if (known !== undefined) {
    return known;
  }
  return id
    .split(/[-_]/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Cached catalog services array
 */
let cachedCatalog: Service[] | null = null;

/**
 * Returns all 220+ AWS baseline services from the built-in icon repository.
 *
 * @returns Array of Service objects for all known AWS services
 */
export function getCatalogServices(): Service[] {
  if (cachedCatalog !== null) {
    return cachedCatalog;
  }

  cachedCatalog = Object.entries(DEFAULT_ICON_MAP).map(([id, iconUrl]) => {
    let homePath = `${id}/home`;
    if (id === 'route53' || id === 'connect') {
      homePath = `${id}/v2/home`;
    } else if (id === 'sns') {
      homePath = `${id}/v3/home`;
    } else if (id === 'cloudfront') {
      homePath = `${id}/v4/home`;
    }

    return {
      id,
      name: formatServiceName(id),
      iconUrl,
      consoleUrl: `https://console.aws.amazon.com/${homePath}`
    };
  });

  return cachedCatalog;
}

/**
 * Combines currently cached/favorite services with the full AWS catalog,
 * ensuring cached services (with live URLs and active region data) take precedence.
 *
 * @param baseServices - Currently loaded services (favorites + recent)
 * @param catalogServices - Baseline catalog services (defaults to getCatalogServices())
 * @returns Deduplicated array containing all searchable services
 */
export function getUnifiedSearchPool(
  baseServices: Service[],
  catalogServices: Service[] = getCatalogServices()
): Service[] {
  const seenIds = new Set<string>();
  const unified: Service[] = [];

  for (const service of baseServices) {
    const lowerId = service.id.toLowerCase();
    if (!seenIds.has(lowerId)) {
      seenIds.add(lowerId);
      unified.push(service);
    }
  }

  for (const service of catalogServices) {
    const lowerId = service.id.toLowerCase();
    if (!seenIds.has(lowerId)) {
      seenIds.add(lowerId);
      unified.push(service);
    }
  }

  return unified;
}
