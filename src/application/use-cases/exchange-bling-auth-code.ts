import type {
  BlingOAuthGateway,
  BlingOAuthTokens,
} from '../gateways/bling-oauth-gateway';

interface ExchangeBlingAuthCodeInput {
  code: string;
  redirectUri: string;
}

interface ExchangeBlingAuthCodeDependencies {
  blingOAuthGateway: BlingOAuthGateway;
}

type ExchangeBlingAuthCodeResult = {
  type: 'bling_auth_code_exchanged';
  tokens: BlingOAuthTokens;
};

export async function exchangeBlingAuthCode(
  input: ExchangeBlingAuthCodeInput,
  dependencies: ExchangeBlingAuthCodeDependencies,
): Promise<ExchangeBlingAuthCodeResult> {
  const tokens = await dependencies.blingOAuthGateway.exchangeAuthorizationCode({
    code: input.code,
    redirectUri: input.redirectUri,
  });

  return {
    type: 'bling_auth_code_exchanged',
    tokens,
  };
}
