// Entra sign-in for reading the private reports container. The Static Web App
// already requires the owner role; this token is what Blob Storage checks.

import {createStandardPublicClientApplication, InteractionRequiredAuthError, type IPublicClientApplication} from '@azure/msal-browser';

const SCOPES = ['https://storage.azure.com/user_impersonation'];

let client: Promise<IPublicClientApplication> | null = null;

function msal() {
  client ??= createStandardPublicClientApplication({
    auth: {
      clientId: import.meta.env.VITE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}`,
      // redirect.html runs MSAL's redirect bridge, which v5 needs for every flow.
      redirectUri: new URL('/redirect.html', location.origin).href,
    },
    // Session storage: tokens go away with the tab. Silent SSO signs in again.
    cache: {cacheLocation: 'sessionStorage'},
  });
  return client;
}

/** The address the Static Web App signed in with, used as a login hint. */
async function staticWebAppUser(): Promise<string | undefined> {
  try {
    const response = await fetch('/.auth/me', {cache: 'no-store'});
    if (!response.ok) return undefined;
    const body = await response.json() as {clientPrincipal?: {userDetails?: string}};
    return body.clientPrincipal?.userDetails || undefined;
  } catch {
    return undefined;
  }
}

/** Returns a Blob Storage token, redirecting to sign in when needed. */
export async function storageToken(): Promise<string> {
  const pca = await msal();
  const returned = await pca.handleRedirectPromise();
  if (returned?.account) pca.setActiveAccount(returned.account);
  if (returned?.accessToken) return returned.accessToken;

  const account = pca.getActiveAccount() ?? pca.getAllAccounts()[0];
  if (account) {
    try {
      return (await pca.acquireTokenSilent({scopes: SCOPES, account})).accessToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) throw error;
    }
  }
  const loginHint = await staticWebAppUser();
  if (loginHint && !account) {
    try {
      const result = await pca.ssoSilent({scopes: SCOPES, loginHint});
      pca.setActiveAccount(result.account);
      return result.accessToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) console.warn('Silent sign-in failed', error);
    }
  }
  await pca.acquireTokenRedirect({scopes: SCOPES, loginHint});
  // The page navigates away; never resolve.
  return new Promise(() => {});
}
