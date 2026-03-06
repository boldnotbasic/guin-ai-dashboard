// Microsoft Graph API Configuration for Outlook Integration
// Documentation: https://learn.microsoft.com/en-us/graph/api/overview

// IMPORTANT: You need to register your own Azure app to use this
// For now, this uses a test client ID that requires Azure app registration
// See EMAIL_INTEGRATION_SETUP_INSTRUCTIONS.md for setup steps
export const msalConfig = {
  auth: {
    // You MUST replace this with your own Azure app client ID
    // Get it from: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps
    clientId: process.env.REACT_APP_MICROSOFT_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  }
};

export const loginRequest = {
  scopes: [
    'User.Read',
    'Mail.Read',
    'Mail.ReadWrite',
    'offline_access'
  ]
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphMailEndpoint: 'https://graph.microsoft.com/v1.0/me/messages'
};

// Email filter query builder
export const buildEmailFilterQuery = (filters) => {
  const conditions = [];
  
  filters.forEach(filter => {
    if (!filter.is_active) return;
    
    switch (filter.filter_type) {
      case 'keyword':
        conditions.push(`(contains(subject,'${filter.filter_value}') or contains(body/content,'${filter.filter_value}'))`);
        break;
      case 'sender':
        conditions.push(`from/emailAddress/address eq '${filter.filter_value}'`);
        break;
      case 'subject':
        conditions.push(`contains(subject,'${filter.filter_value}')`);
        break;
      default:
        break;
    }
  });
  
  return conditions.length > 0 ? conditions.join(' or ') : null;
};

// Format email for storage
export const formatEmailForStorage = (graphEmail, projectId, matchedFilters) => {
  return {
    project_id: projectId,
    email_id: graphEmail.id,
    subject: graphEmail.subject || '(No Subject)',
    from_email: graphEmail.from?.emailAddress?.address || '',
    from_name: graphEmail.from?.emailAddress?.name || '',
    to_emails: graphEmail.toRecipients?.map(r => r.emailAddress.address) || [],
    cc_emails: graphEmail.ccRecipients?.map(r => r.emailAddress.address) || [],
    body_preview: graphEmail.bodyPreview || '',
    body_content: graphEmail.body?.content || '',
    received_date: graphEmail.receivedDateTime,
    is_read: graphEmail.isRead || false,
    has_attachments: graphEmail.hasAttachments || false,
    importance: graphEmail.importance || 'normal',
    matched_filters: matchedFilters
  };
};
