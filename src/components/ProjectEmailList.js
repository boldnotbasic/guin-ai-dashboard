import React, { useState, useEffect } from 'react';
import { Mail, MailOpen, Paperclip, Star, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { db } from '../utils/supabaseClient';

const ProjectEmailList = ({ projectId }) => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    loadEmails();
  }, [projectId]);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const data = await db.projectEmails.getByProject(projectId);
      setEmails(data);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (emailId) => {
    try {
      await db.projectEmails.markAsRead(emailId);
      await loadEmails();
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  const deleteEmail = async (emailId) => {
    if (!window.confirm('Weet je zeker dat je deze email wilt verwijderen?')) return;
    
    try {
      await db.projectEmails.delete(emailId);
      await loadEmails();
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('Error deleting email:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min geleden`;
    if (diffHours < 24) return `${diffHours} uur geleden`;
    if (diffDays < 7) return `${diffDays} dagen geleden`;
    
    return date.toLocaleDateString('nl-NL', { 
      day: 'numeric', 
      month: 'short', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const getImportanceColor = (importance) => {
    switch (importance) {
      case 'high': return 'text-red-400';
      case 'low': return 'text-blue-400';
      default: return 'text-white/60';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
            <Mail className="w-5 h-5" />
            <span>Project Emails</span>
          </h3>
          <p className="text-white/60 text-sm mt-1">
            {emails.length} {emails.length === 1 ? 'email' : 'emails'} gekoppeld aan dit project
          </p>
        </div>
        <button
          onClick={loadEmails}
          className="glass-effect px-4 py-2 rounded-lg text-white flex items-center space-x-2 hover:bg-white/10"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Ververs</span>
        </button>
      </div>

      {loading && emails.length === 0 ? (
        <div className="gradient-card rounded-xl p-8 text-center">
          <RefreshCw className="w-8 h-8 text-white/50 mx-auto animate-spin" />
          <p className="text-white/60 mt-2">Emails laden...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="gradient-card rounded-xl p-8 text-center">
          <Mail className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">Nog geen emails gekoppeld</p>
          <p className="text-white/40 text-sm mt-1">
            Emails worden automatisch gekoppeld op basis van je filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Email List */}
          <div className="space-y-2">
            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => {
                  setSelectedEmail(email);
                  if (!email.is_read) markAsRead(email.id);
                }}
                className={`gradient-card rounded-lg p-4 cursor-pointer transition-all hover:bg-white/10 ${
                  selectedEmail?.id === email.id ? 'ring-2 ring-blue-500' : ''
                } ${!email.is_read ? 'border-l-4 border-blue-500' : ''}`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                    email.is_read ? 'from-gray-500 to-gray-600' : 'from-blue-500 to-cyan-500'
                  } flex items-center justify-center text-white flex-shrink-0`}>
                    {email.is_read ? <MailOpen className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-semibold truncate ${
                        email.is_read ? 'text-white/70' : 'text-white'
                      }`}>
                        {email.from_name || email.from_email}
                      </h4>
                      <span className="text-white/40 text-xs flex-shrink-0 ml-2">
                        {formatDate(email.received_date)}
                      </span>
                    </div>
                    <p className={`text-sm truncate mb-1 ${
                      email.is_read ? 'text-white/50' : 'text-white/70'
                    }`}>
                      {email.subject}
                    </p>
                    <p className="text-white/40 text-xs truncate">
                      {email.body_preview}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      {email.has_attachments && (
                        <span className="text-white/40 text-xs flex items-center space-x-1">
                          <Paperclip className="w-3 h-3" />
                        </span>
                      )}
                      {email.importance !== 'normal' && (
                        <span className={`text-xs ${getImportanceColor(email.importance)}`}>
                          {email.importance === 'high' ? '⚠️ Belangrijk' : '🔵 Laag'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Email Detail View */}
          <div className="gradient-card rounded-xl p-6 sticky top-4 h-fit max-h-[600px] overflow-y-auto">
            {selectedEmail ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-2">
                      {selectedEmail.subject}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-white/50">Van:</span>
                        <span className="text-white">
                          {selectedEmail.from_name} &lt;{selectedEmail.from_email}&gt;
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white/50">Datum:</span>
                        <span className="text-white/70">
                          {new Date(selectedEmail.received_date).toLocaleString('nl-NL')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEmail(selectedEmail.id)}
                    className="glass-effect p-2 rounded-lg text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div 
                    className="text-white/80 text-sm prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: selectedEmail.body_content || selectedEmail.body_preview 
                    }}
                  />
                </div>

                {selectedEmail.matched_filters && (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-white/50 text-xs mb-2">Matched Filters:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedEmail.matched_filters).map(([key, value]) => (
                        <span key={key} className="glass-effect px-2 py-1 rounded text-xs text-white/70">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/50">Selecteer een email om te bekijken</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectEmailList;
