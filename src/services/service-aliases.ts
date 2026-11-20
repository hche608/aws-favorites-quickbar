/**
 * AWS Service ID Aliases and Canonical Normalization
 *
 * Maps console routing path tokens and alternative aliases to canonical service IDs
 * present in the AWS service catalog and default icon repository.
 */

/**
 * Mapping table from URL route segments or alternative IDs to canonical service IDs.
 */
export const SERVICE_ID_ALIASES: Record<string, string> = {
  // Console modern micro-frontends & versioned routes
  vpcconsole: 'vpc',
  iamv2: 'iam',
  wafv2: 'wafv2-pro',
  waf: 'wafv2-pro',
  appstream: 'appstream2',

  // Service brand name vs internal console namespace
  stepfunctions: 'states',
  opensearch: 'aos',
  es: 'aos',
  identitycenter: 'singlesignon',
  billing: 'costmanagement',
  'cost-management': 'costmanagement',
  'certificate-manager': 'acm',
  beanstalk: 'elasticbeanstalk',
  ssm: 'systems-manager',
  eventbridge: 'events',
  quicksight: 'qs',
  documentdb: 'docdb'
};

/**
 * Normalizes a service ID or URL path token to its canonical AWS service ID.
 *
 * @param serviceId - Raw service ID or path segment (case-insensitive)
 * @returns Canonical lowercase service ID, or the original lowercase ID if no alias exists
 */
export function normalizeServiceId(serviceId: string | null | undefined): string {
  if (!serviceId || typeof serviceId !== 'string') {
    return '';
  }
  const lower = serviceId.toLowerCase();
  return SERVICE_ID_ALIASES[lower] ?? lower;
}
