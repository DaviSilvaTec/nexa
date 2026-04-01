export interface BlingOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface BlingOAuthGateway {
  exchangeAuthorizationCode(input: {
    code: string;
    redirectUri: string;
  }): Promise<BlingOAuthTokens>;
  refreshAccessToken(input: {
    refreshToken: string;
  }): Promise<BlingOAuthTokens>;
}
