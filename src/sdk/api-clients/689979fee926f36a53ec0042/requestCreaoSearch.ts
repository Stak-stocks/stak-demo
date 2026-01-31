import { search as requestCreaoSearch } from './_impl/sdk.gen';

// please read type definitions: src/sdk/api-clients/689979fee926f36a53ec0042/_impl/types.gen.ts
// to learn about type and default values
export type { SearchData, SearchErrors, SearchResponses } from './_impl/types.gen';

// Type definition of request function:
// async function requestCreaoSearch(opts: SearchData): Promise<{
//     error?: SearchErrors[keyof SearchErrors],
//     data?: SearchResponses[keyof SearchResponses],
//     request: Request,
//     response: Response
// }>
export { requestCreaoSearch };