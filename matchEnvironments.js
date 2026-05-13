/** Built-in asset CDN environments (popup Environment dropdown). */
export const MATCH_ENVIRONMENTS = [
    { label: 'Dev', match: 'https://assets-dev.mongodb-cdn.com/mms' },
    { label: 'QA', match: 'https://assets-qa.mongodb-cdn.com/mms' },
    { label: 'Prod', match: 'https://assets.mongodb.com/mms' },
];

export const DEFAULT_ENVIRONMENT = MATCH_ENVIRONMENTS[0];