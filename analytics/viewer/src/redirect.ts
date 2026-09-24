import {broadcastResponseToMainFrame} from '@azure/msal-browser/redirect-bridge';

broadcastResponseToMainFrame().catch(error => {
  console.error(error);
  document.body.textContent = 'Sign-in failed. Close this window and reload the report.';
});
