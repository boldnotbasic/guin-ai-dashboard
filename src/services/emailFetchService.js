import { Client } from '@microsoft/microsoft-graph-client';
import outlookAuthService from './outlookAuthService';
import { buildEmailFilterQuery, formatEmailForStorage } from '../config/microsoftGraph';
import { db } from '../utils/supabaseClient';

class EmailFetchService {
  constructor() {
    this.graphClient = null;
  }

  async initializeGraphClient() {
    try {
      const accessToken = await outlookAuthService.getAccessToken();
      
      this.graphClient = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        }
      });

      return this.graphClient;
    } catch (error) {
      console.error('Error initializing Graph client:', error);
      throw error;
    }
  }

  async fetchEmailsForProject(projectId) {
    try {
      if (!this.graphClient) {
        await this.initializeGraphClient();
      }

      // Get project filters
      const filters = await db.emailFilters.getByProject(projectId);
      
      if (filters.length === 0) {
        console.log('No filters configured for project:', projectId);
        return [];
      }

      // Build filter query
      const filterQuery = buildEmailFilterQuery(filters);
      
      if (!filterQuery) {
        console.log('No active filters for project:', projectId);
        return [];
      }

      // Fetch emails from Microsoft Graph API
      const response = await this.graphClient
        .api('/me/messages')
        .filter(filterQuery)
        .select('id,subject,from,toRecipients,ccRecipients,bodyPreview,body,receivedDateTime,isRead,hasAttachments,importance')
        .top(50)
        .orderby('receivedDateTime DESC')
        .get();

      const emails = response.value || [];
      
      // Store emails in database
      const storedEmails = [];
      for (const email of emails) {
        try {
          // Check if email already exists
          const existingEmails = await db.projectEmails.getByProject(projectId);
          const exists = existingEmails.find(e => e.email_id === email.id);
          
          if (!exists) {
            // Determine which filters matched
            const matchedFilters = this.getMatchedFilters(email, filters);
            
            // Format and store email
            const emailData = formatEmailForStorage(email, projectId, matchedFilters);
            const stored = await db.projectEmails.create(emailData);
            storedEmails.push(stored);
          }
        } catch (error) {
          console.error('Error storing email:', email.id, error);
        }
      }

      return storedEmails;
    } catch (error) {
      console.error('Error fetching emails for project:', error);
      throw error;
    }
  }

  async fetchEmailsForAllProjects() {
    try {
      // Get all projects
      const projects = await db.projects.getAll();
      
      const results = [];
      for (const project of projects) {
        try {
          const emails = await this.fetchEmailsForProject(project.id);
          results.push({
            projectId: project.id,
            projectName: project.name,
            emailCount: emails.length,
            emails
          });
        } catch (error) {
          console.error(`Error fetching emails for project ${project.id}:`, error);
          results.push({
            projectId: project.id,
            projectName: project.name,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching emails for all projects:', error);
      throw error;
    }
  }

  getMatchedFilters(email, filters) {
    const matched = {};
    
    filters.forEach(filter => {
      if (!filter.is_active) return;
      
      const value = filter.filter_value.toLowerCase();
      
      switch (filter.filter_type) {
        case 'keyword':
          const subject = (email.subject || '').toLowerCase();
          const body = (email.bodyPreview || '').toLowerCase();
          if (subject.includes(value) || body.includes(value)) {
            matched[filter.filter_type] = filter.filter_value;
          }
          break;
          
        case 'sender':
          const fromEmail = email.from?.emailAddress?.address?.toLowerCase() || '';
          if (fromEmail === value) {
            matched[filter.filter_type] = filter.filter_value;
          }
          break;
          
        case 'subject':
          const emailSubject = (email.subject || '').toLowerCase();
          if (emailSubject.includes(value)) {
            matched[filter.filter_type] = filter.filter_value;
          }
          break;
          
        default:
          break;
      }
    });
    
    return matched;
  }

  async syncEmails(projectId = null) {
    try {
      if (projectId) {
        return await this.fetchEmailsForProject(projectId);
      } else {
        return await this.fetchEmailsForAllProjects();
      }
    } catch (error) {
      console.error('Error syncing emails:', error);
      throw error;
    }
  }
}

export default new EmailFetchService();
