import type {
  BlingOAuthGateway,
  BlingOAuthTokens,
} from '../../../application/gateways/bling-oauth-gateway';

interface BlingOAuthHttpGatewayDependencies {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
}

export class BlingOAuthHttpGateway implements BlingOAuthGateway {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetchImpl: typeof fetch;

  constructor(dependencies: BlingOAuthHttpGatewayDependencies) {
    this.baseUrl = dependencies.baseUrl.replace(/\/$/, '');
    this.clientId = dependencies.clientId;
    this.clientSecret = dependencies.clientSecret;
    this.fetchImpl = dependencies.fetchImpl ?? fetch;
  }

  async exchangeAuthorizationCode(input: {
    code: string;
    redirectUri: string;
  }): Promise<BlingOAuthTokens> {
    return this.sendTokenRequest(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        redirect_uri: input.redirectUri,
      }),
    );
  }

  async refreshAccessToken(input: {
    refreshToken: string;
  }): Promise<BlingOAuthTokens> {
    return this.sendTokenRequest(
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: input.refreshToken,
      }),
    );
  }

  private async sendTokenRequest(
    body: URLSearchParams,
  ): Promise<BlingOAuthTokens> {
    const basicToken = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
      'utf-8',
    ).toString('base64');

    const response = await this.fetchImpl(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: new Headers({
        Authorization: `Basic ${basicToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Bling OAuth exchange failed with status ${response.status}: ${errorBody}`,
      );
    }

    const responseBody = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (
      !responseBody.access_token ||
      !responseBody.refresh_token ||
      responseBody.expires_in === undefined
    ) {
      throw new Error('Bling OAuth exchange failed: missing token fields in response.');
    }

    return {
      accessToken: responseBody.access_token,
      refreshToken: responseBody.refresh_token,
      expiresIn: responseBody.expires_in,
    };
  }
}
