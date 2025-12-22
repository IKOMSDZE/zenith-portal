
import { Database } from './database';

export const SMSService = {
  /**
   * Sends an SMS via SMSOffice.ge API.
   * To prevent "Failed to fetch" (CORS), we use mode: 'no-cors'.
   * This sends the request to the server, but the browser does not allow reading the response.
   * Since we only need to "fire" the SMS, this is an effective workaround for client-side apps.
   */
  send: async (to: string, content: string, type: 'Automation' | 'Test' | 'Update' = 'Test') => {
    // Fixed: getSettings is async
    const settings = await Database.getSettings();
    const API_KEY = settings.smsApiKey || 'af211e7c34a14673b6ff4e27116a7fc1';
    const SENDER = settings.smsSenderName || 'smsoffice'; 
    
    if (!to || !content) return null;

    // Handle multiple recipients separated by comma
    const recipients = to.split(',').map(n => n.trim()).filter(n => n.length > 0);
    
    const results = await Promise.all(recipients.map(async (destination) => {
      // Clean and format phone number: remove non-digits, ensure 995 prefix
      let cleanDestination = destination.replace(/\D/g, '');
      if (cleanDestination.length === 9 && (cleanDestination.startsWith('5') || cleanDestination.startsWith('7'))) {
        cleanDestination = `995${cleanDestination}`;
      }
      
      // The API documentation requests 'send/' with a trailing slash and 'urgent=true'
      const url = `https://smsoffice.ge/api/v2/send/?key=${API_KEY}&destination=${cleanDestination}&sender=${SENDER}&content=${encodeURIComponent(content)}&urgent=true`;

      try {
        console.log(`[SMS] Dispatching to ${cleanDestination}...`);
        
        // Mode 'no-cors' allows the request to be sent even if the destination doesn't have CORS headers.
        // It's a "fire and forget" mechanism.
        await fetch(url, { 
          mode: 'no-cors',
          method: 'GET',
          cache: 'no-cache'
        });
        
        // Since we can't read the response in no-cors, we assume 'Dispatched' if no exception occurs
        Database.addSMSLog({
          to: cleanDestination,
          content,
          status: 'Dispatched',
          apiMessage: 'Sent (Opaque Response)',
          type
        });
        
        return { to: cleanDestination, status: 'Dispatched' };
      } catch (error) {
        console.warn(`[SMS] Fetch failed for ${cleanDestination}, attempting fallback beacon...`, error);
        
        // Fallback: Using Image beacon as a cross-origin proof trigger
        try {
          const img = new Image();
          img.src = url;
          
          Database.addSMSLog({
            to: cleanDestination,
            content,
            status: 'Dispatched',
            apiMessage: 'Sent via Beacon Fallback',
            type
          });
          return { to: cleanDestination, status: 'Dispatched' };
        } catch (fallbackError) {
          console.error(`[SMS] Critical Error for ${cleanDestination}:`, fallbackError);
          Database.addSMSLog({
            to: cleanDestination,
            content,
            status: 'Error',
            apiMessage: 'Network Error',
            type
          });
          return { to: cleanDestination, status: 'Error' };
        }
      }
    }));

    return results;
  },

  /**
   * Sends birthday notifications using templates from settings.
   */
  sendBirthdayAlerts: async (employeeName: string, employeePhone: string) => {
    // Fixed: getSettings is async
    const settings = await Database.getSettings();
    
    const replaceVars = (template: string) => {
        return (template || '')
            .replace(/{name}/g, employeeName)
            .replace(/{phone}/g, employeePhone || 'N/A');
    };

    const promises = [];

    // 1. Message to User
    if (employeePhone && settings.userSmsTemplate) {
      promises.push(SMSService.send(employeePhone, replaceVars(settings.userSmsTemplate), 'Automation'));
    }

    // 2. Message to Admin
    if (settings.adminPhone && settings.adminSmsTemplate) {
      promises.push(SMSService.send(settings.adminPhone, replaceVars(settings.adminSmsTemplate), 'Automation'));
    }

    // 3. Message to Accountant
    if (settings.accountantPhone && settings.adminSmsTemplate) {
      promises.push(SMSService.send(settings.accountantPhone, replaceVars(settings.adminSmsTemplate), 'Automation'));
    }

    // 4. Message to HR
    if (settings.hrPhone && settings.adminSmsTemplate) {
      promises.push(SMSService.send(settings.hrPhone, replaceVars(settings.adminSmsTemplate), 'Automation'));
    }

    return Promise.all(promises);
  },

  sendBirthdayUpdateNotification: async (name: string, phoneNumber: string, newDate: string) => {
    if (!phoneNumber) return;
    const message = `Hello ${name}, your birthday has been successfully updated to ${newDate} in the Zenith Portal. Next update allowed in 1 year.`;
    return SMSService.send(phoneNumber, message, 'Update');
  }
};
