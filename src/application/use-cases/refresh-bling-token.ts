import type {
  BlingOAuthGateway,
  BlingOAuthTokens,
} from '../gateways/bling-oauth-gateway';

interface RefreshBlingTokenInput {
  refreshToken: string;
}

interface RefreshBlingTokenDependencies {
  blingOAuthGateway: BlingOAuthGateway;
}

type RefreshBlingTokenResult = {
  type: 'bling_token_refreshed';
  tokens: BlingOAuthTokens;
};

export async function refreshBlingToken(
  input: RefreshBlingTokenInput,
  dependencies: RefreshBlingTokenDependencies,
): Promise<RefreshBlingTokenResult> {
  const tokens = await dependencies.blingOAuthGateway.refreshAccessToken({
    refreshToken: input.refreshToken,
  });

  return {
    type: 'bling_token_refreshed',
    tokens,
  };
}
