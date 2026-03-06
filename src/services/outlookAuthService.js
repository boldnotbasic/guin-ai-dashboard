import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../config/microsoftGraph';
import { db } from '../utils/supabaseClient';

class OutlookAuthService {
  constructor() {
    this.msalInstance = null;
    this.account = null;
  }

  async initialize() {
    try {
      this.msalInstance = new PublicClientApplication(msalConfig);
      await this.msalInstance.initialize();
      
      // Check if user is already signed in
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        this.account = accounts[0];
      }
    } catch (error) {
      console.error('Error initializing MSAL:', error);
      throw error;
    }
  }

  async login() {
    try {
      if (!this.msalInstance) {
        await this.initialize();
      }

      const loginResponse = await this.msalInstance.loginPopup(loginRequest);
      this.account = loginResponse.account;

      // Store connection in database
      await this.saveConnection(loginResponse);

      return loginResponse;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  async getAccessToken() {
    try {
      if (!this.msalInstance) {
        await this.initialize();
      }

      if (!this.account) {
        const accounts = this.msalInstance.getAllAccounts();
        if (accounts.length === 0) {
          throw new Error('No account found. Please login first.');
        }
        this.account = accounts[0];
      }

      const request = {
        ...loginRequest,
        account: this.account
      };

      try {
        // Try to get token silently
        const response = await this.msalInstance.acquireTokenSilent(request);
        return response.accessToken;
      } catch (error) {
        // If silent token acquisition fails, try interactive
        const response = await this.msalInstance.acquireTokenPopup(request);
        return response.accessToken;
      }
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  async saveConnection(loginResponse) {
    try {
      const existingConnection = await db.outlookConnections.get();
      
      const connectionData = {
        user_id: loginResponse.account.localAccountId,
        email_address: loginResponse.account.username,
        tenant_id: loginResponse.account.tenantId,
        access_token: loginResponse.accessToken,
        refresh_token: loginResponse.refreshToken || null,
        token_expires_at: new Date(Date.now() + (loginResponse.expiresOn || 3600) * 1000).toISOString(),
        is_active: true
      };

      if (existingConnection) {
        await db.outlookConnections.update(existingConnection.id, connectionData);
      } else {
        await db.outlookConnections.create(connectionData);
      }
    } catch (error) {
      console.error('Error saving connection:', error);
      throw error;
    }
  }

  async logout() {
    try {
      if (!this.msalInstance) {
        await this.initialize();
      }

      const logoutRequest = {
        account: this.account
      };

      await this.msalInstance.logoutPopup(logoutRequest);
      this.account = null;

      // Deactivate connection in database
      const connection = await db.outlookConnections.get();
      if (connection) {
        await db.outlookConnections.update(connection.id, { is_active: false });
      }
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }

  isAuthenticated() {
    return this.account !== null;
  }

  getAccount() {
    return this.account;
  }
}

export default new OutlookAuthService();
