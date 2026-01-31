// SDK exports these request functions:
//
//   /**
//    * Search News and Information
//    *
//    * Performs a search query and returns results in the specified language.
//    */
//
//   export function search(opts: SearchData): Promise<{
//     error?: SearchErrors[keyof SearchErrors],
//     data?: SearchResponses[keyof SearchResponses],
//     request: Request,
//     response: Response }>;
//
//   ALIAS: search is equivalent to: import { requestCreaoSearch } from '@/sdk/api-clients/689979fee926f36a53ec0042/requestCreaoSearch'
//
// <system-reminder>
// Prefer default / example values from original openapi schema:
// {"openapi":"3.0.3","info":{"title":"CloudsWaySearch API","description":"AI-powered search API for getting news and information. User provides search query and language, system constructs the full URL with query parameters.","version":"1.0.0"},"servers":[{"url":"http://searchapi.cloudsway.net"}],"paths":{"/search/ZwEDEMkvaTthUZhz/smart":{"get":{"summary":"Search News and Information","description":"Performs a search query and returns results in the specified language.","operationId":"search","parameters":[{"name":"q","in":"query","required":true,"schema":{"type":"string"},"description":"Search query (e.g., \"weather\", \"AI agent news\")"},{"name":"setLang","in":"query","required":false,"schema":{"type":"string","enum":["en","es","fr","de","zh","ja"],"default":"en"},"description":"Language setting for search results"}],"responses":{"200":{"description":"Successful search response","content":{"application/json":{"schema":{"type":"object","required":["queryContext","webPages"],"properties":{"queryContext":{"type":"object","required":["originalQuery"],"properties":{"originalQuery":{"type":"string","description":"The original search query","example":"shanghai"}},"additionalProperties":true},"webPages":{"type":"object","required":["value"],"properties":{"value":{"type":"array","description":"Array of web page search results","items":{"type":"object","required":["name","url"],"properties":{"name":{"type":"string","description":"Title of the web page","example":"Shanghai - Wikipedia"},"url":{"type":"string","format":"uri","description":"URL of the web page","example":"https://en.wikipedia.org/wiki/Shanghai"},"displayUrl":{"type":"string","description":"Display-friendly version of the URL","example":"https://en.wikipedia.org/wiki/Shanghai"},"snippet":{"type":"string","description":"Brief excerpt or summary of the content","example":"Shanghai is a direct-administered municipality and the most populous urban area in China..."},"dateLastCrawled":{"type":"string","format":"date-time","description":"When the content was last crawled","example":"2025-08-10T11:03:00Z"},"siteName":{"type":"string","description":"Name of the website","example":"Wikipedia"},"datePublished":{"type":"string","format":"date-time","description":"When the content was published (optional)","example":"2025-08-03T00:00:00Z"},"thumbnailUrl":{"type":"string","format":"uri","description":"URL of thumbnail image (optional)","example":"https://www.bing.com/th?id=OIP.nC1rdCACAagIyg9pjPBTWgHaDt&w=80&h=80&c=1&pid=5.1"}},"additionalProperties":true}}},"additionalProperties":true}},"additionalProperties":true}}}},"401":{"description":"Unauthorized - Invalid or missing API key"}},"security":[{"ApiKeyAuth":[]}]}}},"components":{"securitySchemes":{"BearerAuth":{"type":"http","scheme":"bearer","bearerFormat":"JWT","description":"Bearer token authentication","x-bearer-token":"vEsmqzTy0oqHAuRkS1bh"}},"schemas":{"SearchResponse":{"type":"object","required":["queryContext","webPages"],"properties":{"queryContext":{"type":"object","required":["originalQuery"],"properties":{"originalQuery":{"type":"string","description":"The original search query","example":"shanghai"}},"additionalProperties":true},"webPages":{"type":"object","required":["value"],"properties":{"value":{"type":"array","description":"Array of web page search results","items":{"type":"object","required":["name","url"],"properties":{"name":{"type":"string","description":"Title of the web page","example":"Shanghai - Wikipedia"},"url":{"type":"string","format":"uri","description":"URL of the web page","example":"https://en.wikipedia.org/wiki/Shanghai"},"displayUrl":{"type":"string","description":"Display-friendly version of the URL","example":"https://en.wikipedia.org/wiki/Shanghai"},"snippet":{"type":"string","description":"Brief excerpt or summary of the content","example":"Shanghai is a direct-administered municipality and the most populous urban area in China..."},"dateLastCrawled":{"type":"string","format":"date-time","description":"When the content was last crawled","example":"2025-08-10T11:03:00Z"},"siteName":{"type":"string","description":"Name of the website","example":"Wikipedia"},"datePublished":{"type":"string","format":"date-time","description":"When the content was published (optional)","example":"2025-08-03T00:00:00Z"},"thumbnailUrl":{"type":"string","format":"uri","description":"URL of thumbnail image (optional)","example":"https://www.bing.com/th?id=OIP.nC1rdCACAagIyg9pjPBTWgHaDt&w=80&h=80&c=1&pid=5.1"}},"additionalProperties":true}}},"additionalProperties":true}},"additionalProperties":true},"QueryContext":{"type":"object","required":["originalQuery"],"properties":{"originalQuery":{"type":"string","description":"The original search query","example":"shanghai"}},"additionalProperties":true},"WebPages":{"type":"object","required":["value"],"properties":{"value":{"type":"array","description":"Array of web page search results","items":{"type":"object","required":["name","url"],"properties":{"name":{"type":"string","description":"Title of the web page","example":"Shanghai - Wikipedia"},"url":{"type":"string","format":"uri","description":"URL of the web page","example":"https://en.wikipedia.org/wiki/Shanghai"},"displayUrl":{"type":"string","description":"Display-friendly version of the URL","example":"https://en.wikipedia.org/wiki/Shanghai"},"snippet":{"type":"string","description":"Brief excerpt or summary of the content","example":"Shanghai is a direct-administered municipality and the most populous urban area in China..."},"dateLastCrawled":{"type":"string","format":"date-time","description":"When the content was last crawled","example":"2025-08-10T11:03:00Z"},"siteName":{"type":"string","description":"Name of the website","example":"Wikipedia"},"datePublished":{"type":"string","format":"date-time","description":"When the content was published (optional)","example":"2025-08-03T00:00:00Z"},"thumbnailUrl":{"type":"string","format":"uri","description":"URL of thumbnail image (optional)","example":"https://www.bing.com/th?id=OIP.nC1rdCACAagIyg9pjPBTWgHaDt&w=80&h=80&c=1&pid=5.1"}},"additionalProperties":true}}},"additionalProperties":true},"WebPageResult":{"type":"object","required":["name","url"],"properties":{"name":{"type":"string","description":"Title of the web page","example":"Shanghai - Wikipedia"},"url":{"type":"string","format":"uri","description":"URL of the web page","example":"https://en.wikipedia.org/wiki/Shanghai"},"displayUrl":{"type":"string","description":"Display-friendly version of the URL","example":"https://en.wikipedia.org/wiki/Shanghai"},"snippet":{"type":"string","description":"Brief excerpt or summary of the content","example":"Shanghai is a direct-administered municipality and the most populous urban area in China..."},"dateLastCrawled":{"type":"string","format":"date-time","description":"When the content was last crawled","example":"2025-08-10T11:03:00Z"},"siteName":{"type":"string","description":"Name of the website","example":"Wikipedia"},"datePublished":{"type":"string","format":"date-time","description":"When the content was published (optional)","example":"2025-08-03T00:00:00Z"},"thumbnailUrl":{"type":"string","format":"uri","description":"URL of thumbnail image (optional)","example":"https://www.bing.com/th?id=OIP.nC1rdCACAagIyg9pjPBTWgHaDt&w=80&h=80&c=1&pid=5.1"}},"additionalProperties":true}}}}
// </system-reminder>
//
// 

export type ClientOptions = {
    baseUrl: 'http://searchapi.cloudsway.net' | (string & {});
};

export type SearchResponse = {
    queryContext: {
        /**
         * The original search query
         */
        originalQuery: string;
        [key: string]: unknown | string;
    };
    webPages: {
        /**
         * Array of web page search results
         */
        value: Array<{
            /**
             * Title of the web page
             */
            name: string;
            /**
             * URL of the web page
             */
            url: string;
            /**
             * Display-friendly version of the URL
             */
            displayUrl?: string;
            /**
             * Brief excerpt or summary of the content
             */
            snippet?: string;
            /**
             * When the content was last crawled
             */
            dateLastCrawled?: string;
            /**
             * Name of the website
             */
            siteName?: string;
            /**
             * When the content was published (optional)
             */
            datePublished?: string;
            /**
             * URL of thumbnail image (optional)
             */
            thumbnailUrl?: string;
            [key: string]: unknown | string | undefined;
        }>;
        [key: string]: unknown | Array<{
            /**
             * Title of the web page
             */
            name: string;
            /**
             * URL of the web page
             */
            url: string;
            /**
             * Display-friendly version of the URL
             */
            displayUrl?: string;
            /**
             * Brief excerpt or summary of the content
             */
            snippet?: string;
            /**
             * When the content was last crawled
             */
            dateLastCrawled?: string;
            /**
             * Name of the website
             */
            siteName?: string;
            /**
             * When the content was published (optional)
             */
            datePublished?: string;
            /**
             * URL of thumbnail image (optional)
             */
            thumbnailUrl?: string;
            [key: string]: unknown | string | undefined;
        }>;
    };
    [key: string]: unknown | {
        /**
         * The original search query
         */
        originalQuery: string;
        [key: string]: unknown | string;
    } | {
        /**
         * Array of web page search results
         */
        value: Array<{
            /**
             * Title of the web page
             */
            name: string;
            /**
             * URL of the web page
             */
            url: string;
            /**
             * Display-friendly version of the URL
             */
            displayUrl?: string;
            /**
             * Brief excerpt or summary of the content
             */
            snippet?: string;
            /**
             * When the content was last crawled
             */
            dateLastCrawled?: string;
            /**
             * Name of the website
             */
            siteName?: string;
            /**
             * When the content was published (optional)
             */
            datePublished?: string;
            /**
             * URL of thumbnail image (optional)
             */
            thumbnailUrl?: string;
            [key: string]: unknown | string | undefined;
        }>;
        [key: string]: unknown | Array<{
            /**
             * Title of the web page
             */
            name: string;
            /**
             * URL of the web page
             */
            url: string;
            /**
             * Display-friendly version of the URL
             */
            displayUrl?: string;
            /**
             * Brief excerpt or summary of the content
             */
            snippet?: string;
            /**
             * When the content was last crawled
             */
            dateLastCrawled?: string;
            /**
             * Name of the website
             */
            siteName?: string;
            /**
             * When the content was published (optional)
             */
            datePublished?: string;
            /**
             * URL of thumbnail image (optional)
             */
            thumbnailUrl?: string;
            [key: string]: unknown | string | undefined;
        }>;
    };
};

export type QueryContext = {
    /**
     * The original search query
     */
    originalQuery: string;
    [key: string]: unknown | string;
};

export type WebPages = {
    /**
     * Array of web page search results
     */
    value: Array<{
        /**
         * Title of the web page
         */
        name: string;
        /**
         * URL of the web page
         */
        url: string;
        /**
         * Display-friendly version of the URL
         */
        displayUrl?: string;
        /**
         * Brief excerpt or summary of the content
         */
        snippet?: string;
        /**
         * When the content was last crawled
         */
        dateLastCrawled?: string;
        /**
         * Name of the website
         */
        siteName?: string;
        /**
         * When the content was published (optional)
         */
        datePublished?: string;
        /**
         * URL of thumbnail image (optional)
         */
        thumbnailUrl?: string;
        [key: string]: unknown | string | undefined;
    }>;
    [key: string]: unknown | Array<{
        /**
         * Title of the web page
         */
        name: string;
        /**
         * URL of the web page
         */
        url: string;
        /**
         * Display-friendly version of the URL
         */
        displayUrl?: string;
        /**
         * Brief excerpt or summary of the content
         */
        snippet?: string;
        /**
         * When the content was last crawled
         */
        dateLastCrawled?: string;
        /**
         * Name of the website
         */
        siteName?: string;
        /**
         * When the content was published (optional)
         */
        datePublished?: string;
        /**
         * URL of thumbnail image (optional)
         */
        thumbnailUrl?: string;
        [key: string]: unknown | string | undefined;
    }>;
};

export type WebPageResult = {
    /**
     * Title of the web page
     */
    name: string;
    /**
     * URL of the web page
     */
    url: string;
    /**
     * Display-friendly version of the URL
     */
    displayUrl?: string;
    /**
     * Brief excerpt or summary of the content
     */
    snippet?: string;
    /**
     * When the content was last crawled
     */
    dateLastCrawled?: string;
    /**
     * Name of the website
     */
    siteName?: string;
    /**
     * When the content was published (optional)
     */
    datePublished?: string;
    /**
     * URL of thumbnail image (optional)
     */
    thumbnailUrl?: string;
    [key: string]: unknown | string | undefined;
};

export type SearchData = {
    body?: never;
    path?: never;
    query: {
        /**
         * Search query (e.g., "weather", "AI agent news")
         */
        q: string;
        /**
         * Language setting for search results
         */
        setLang?: 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja';
    };
    url: '/search/ZwEDEMkvaTthUZhz/smart';
};

export type SearchErrors = {
    /**
     * Unauthorized - Invalid or missing API key
     */
    401: unknown;
};

export type SearchResponses = {
    /**
     * Successful search response
     */
    200: {
        queryContext: {
            /**
             * The original search query
             */
            originalQuery: string;
            [key: string]: unknown | string;
        };
        webPages: {
            /**
             * Array of web page search results
             */
            value: Array<{
                /**
                 * Title of the web page
                 */
                name: string;
                /**
                 * URL of the web page
                 */
                url: string;
                /**
                 * Display-friendly version of the URL
                 */
                displayUrl?: string;
                /**
                 * Brief excerpt or summary of the content
                 */
                snippet?: string;
                /**
                 * When the content was last crawled
                 */
                dateLastCrawled?: string;
                /**
                 * Name of the website
                 */
                siteName?: string;
                /**
                 * When the content was published (optional)
                 */
                datePublished?: string;
                /**
                 * URL of thumbnail image (optional)
                 */
                thumbnailUrl?: string;
                [key: string]: unknown | string | undefined;
            }>;
            [key: string]: unknown | Array<{
                /**
                 * Title of the web page
                 */
                name: string;
                /**
                 * URL of the web page
                 */
                url: string;
                /**
                 * Display-friendly version of the URL
                 */
                displayUrl?: string;
                /**
                 * Brief excerpt or summary of the content
                 */
                snippet?: string;
                /**
                 * When the content was last crawled
                 */
                dateLastCrawled?: string;
                /**
                 * Name of the website
                 */
                siteName?: string;
                /**
                 * When the content was published (optional)
                 */
                datePublished?: string;
                /**
                 * URL of thumbnail image (optional)
                 */
                thumbnailUrl?: string;
                [key: string]: unknown | string | undefined;
            }>;
        };
        [key: string]: unknown | {
            /**
             * The original search query
             */
            originalQuery: string;
            [key: string]: unknown | string;
        } | {
            /**
             * Array of web page search results
             */
            value: Array<{
                /**
                 * Title of the web page
                 */
                name: string;
                /**
                 * URL of the web page
                 */
                url: string;
                /**
                 * Display-friendly version of the URL
                 */
                displayUrl?: string;
                /**
                 * Brief excerpt or summary of the content
                 */
                snippet?: string;
                /**
                 * When the content was last crawled
                 */
                dateLastCrawled?: string;
                /**
                 * Name of the website
                 */
                siteName?: string;
                /**
                 * When the content was published (optional)
                 */
                datePublished?: string;
                /**
                 * URL of thumbnail image (optional)
                 */
                thumbnailUrl?: string;
                [key: string]: unknown | string | undefined;
            }>;
            [key: string]: unknown | Array<{
                /**
                 * Title of the web page
                 */
                name: string;
                /**
                 * URL of the web page
                 */
                url: string;
                /**
                 * Display-friendly version of the URL
                 */
                displayUrl?: string;
                /**
                 * Brief excerpt or summary of the content
                 */
                snippet?: string;
                /**
                 * When the content was last crawled
                 */
                dateLastCrawled?: string;
                /**
                 * Name of the website
                 */
                siteName?: string;
                /**
                 * When the content was published (optional)
                 */
                datePublished?: string;
                /**
                 * URL of thumbnail image (optional)
                 */
                thumbnailUrl?: string;
                [key: string]: unknown | string | undefined;
            }>;
        };
    };
};

export type SearchResponse2 = SearchResponses[keyof SearchResponses];
