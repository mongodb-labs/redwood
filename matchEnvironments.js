/** Built-in asset CDN environments (popup Environment dropdown). */
export const MATCH_ENVIRONMENTS = [
    { label: 'Dev', match: 'https://assets-dev.mongodb-cdn.com/mms', appServer: 'https://cloud-dev.mongodb.com' },
    { label: 'QA', match: 'https://assets-qa.mongodb-cdn.com/mms', appServer: 'https://cloud-qa.mongodb.com' },
    { label: 'Prod', match: 'https://assets.mongodb-cdn.com/mms', appServer: 'https://cloud.mongodb.com' },
];

export const DEFAULT_ENVIRONMENT = MATCH_ENVIRONMENTS[0];
