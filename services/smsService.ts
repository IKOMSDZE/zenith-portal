
import { Database } from './database';

const LOG_STORAGE_KEY = 'zenith_sms_log_file';

export const SMSService = {
  /**
   * Appends a log entry to the virtual sms.log file in localStorage.
   */
  logLocally: (to: string, content: string, status: string, type: string) => {
    const timestamp = new Date().toLocaleString('ka-GE');
    const logLine = `[${timestamp}] [${type.toUpperCase()}] TO: ${to} | STATUS: ${status} | CONTENT: "${content}"\n`;
    
    const existingLogs = localStorage.getItem(LOG_STORAGE_KEY) || '';
    // Limit log size to prevent localStorage overflow (keep last ~2000 lines)
    const newLogs = (logLine + existingLogs).split('\n').slice(0, 2000).join('\n');
    
    localStorage.setItem(LOG_STORAGE_KEY, newLogs);
    // Dispatch event so UI can update in real-time
    window.dispatchEvent(new CustomEvent('smsLogUpdated', { detail: newLogs }));
  },

  /**
   * Retrieves the content of the virtual sms.log file.
   */
  getRawLogs: (): string => {
    return localStorage.getItem(LOG_STORAGE_KEY) || 'No logs found in sms.log';
  },

  /**
   * Clears the local sms.log file.
   */
  clearLogs: () => {
    localStorage.removeItem(LOG_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('smsLogUpdated', { detail: '' }));
  },

  /**
   * Sends an SMS via SMSOffice.ge API and logs to local sms.log.
   */
  send: async (to: string, content: string, type: 'Automation' | 'Test' | 'Update' = 'Test') => {
    const settings = await Database.getSettings();
    const API_KEY = settings.smsApiKey || 'af211e7c34a14673b6ff4e27116a7fc1';
    const SENDER = settings.smsSenderName || 'smsoffice'; 
    
    if (!to || !content) return null;

    const recipients = to.split(',').map(n => n.trim()).filter(n => n.length > 0);
    
    const results = await Promise.all(recipients.map(async (destination) => {
      let cleanDestination = destination.replace(/\D/g, '');
      if (cleanDestination.length === 9 && (cleanDestination.startsWith('5') || cleanDestination.startsWith('7'))) {
        cleanDestination = `995${cleanDestination}`;
      }
      
      const url = `https://smsoffice.ge/api/v2/send/?key=${API_KEY}&destination=${cleanDestination}&sender=${SENDER}&content=${encodeURIComponent(content)}&urgent=true`;

      try {
        console.log(`[SMS] Dispatching to ${cleanDestination}...`);
        
        await fetch(url, { 
          mode: 'no-cors',
          method: 'GET',
          cache: 'no-cache'
        });
        
        SMSService.logLocally(cleanDestination, content, 'DISPATCHED', type);
        return { to: cleanDestination, status: 'Dispatched' };
      } catch (error) {
        console.warn(`[SMS] Fetch failed for ${cleanDestination}, attempting fallback...`, error);
        
        try {
          const img = new Image();
          img.src = url;
          SMSService.logLocally(cleanDestination, content, 'DISPATCHED (FALLBACK)', type);
          return { to: cleanDestination, status: 'Dispatched' };
        } catch (fallbackError) {
          SMSService.logLocally(cleanDestination, content, 'ERROR', type);
          return { to: cleanDestination, status: 'Error' };
        }
      }
    }));

    return results;
  },

  sendBirthdayAlerts: async (employeeName: string, employeePhone: string) => {
    const settings = await Database.getSettings();
    const replaceVars = (template: string) => {
        return (template || '').replace(/{name}/g, employeeName).replace(/{phone}/g, employeePhone || 'N/A');
    };
    const promises = [];
    if (employeePhone && settings.userSmsTemplate) promises.push(SMSService.send(employeePhone, replaceVars(settings.userSmsTemplate), 'Automation'));
    if (settings.adminPhone && settings.adminSmsTemplate) promises.push(SMSService.send(settings.adminPhone, replaceVars(settings.adminSmsTemplate), 'Automation'));
    if (settings.accountantPhone && settings.adminSmsTemplate) promises.push(SMSService.send(settings.accountantPhone, replaceVars(settings.adminSmsTemplate), 'Automation'));
    if (settings.hrPhone && settings.adminSmsTemplate) promises.push(SMSService.send(settings.hrPhone, replaceVars(settings.adminSmsTemplate), 'Automation'));
    return Promise.all(promises);
  },

  sendBirthdayUpdateNotification: async (name: string, phoneNumber: string, newDate: string) => {
    if (!phoneNumber) return;
    const message = `Hello ${name}, your birthday has been successfully updated to ${newDate} in the Zenith Portal. Next update allowed in 1 year.`;
    return SMSService.send(phoneNumber, message, 'Update');
  }
};
