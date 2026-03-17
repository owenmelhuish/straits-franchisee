declare module "facebook-nodejs-business-sdk" {
  export class FacebookAdsApi {
    static init(accessToken: string): FacebookAdsApi;
  }

  export class AdAccount {
    constructor(id: string);
    createAdImage(
      fields: string[],
      params: Record<string, unknown>
    ): Promise<{ _data: { images: Record<string, { hash: string }> } }>;
    createAdCreative(
      fields: string[],
      params: Record<string, unknown>
    ): Promise<{ _data: { id: string } }>;
    createCampaign(
      fields: string[],
      params: Record<string, unknown>
    ): Promise<{ _data: { id: string } }>;
    createAdSet(
      fields: string[],
      params: Record<string, unknown>
    ): Promise<{ _data: { id: string } }>;
    createAd(
      fields: string[],
      params: Record<string, unknown>
    ): Promise<{ _data: { id: string } }>;
  }

  export class Campaign {}
  export class AdSet {}
  export class Ad {}
  export class AdCreative {}
  export class AdImage {}
}
