
import { Database } from './database';

export const SMSService = {
  /**
   * Sends an SMS via SMSOffice.ge API
   */
  send: async (to: string, content: string) => {
    // Correctly await the async getSettings call
    const settings = await Database.getSettings();
    const API_KEY = settings.smsApiKey || '9fb1518f8d95460f95147575276e6955';
    const SENDER = 'Zenith';
    
    if (!to) return null;

    const destination = to.replace(/\D/g, '');
    const finalDestination = destination.startsWith('995') ? destination : `995${destination}`;

    const url = `https://smsoffice.ge/api/v2/send/?key=${API_KEY}&destination=${finalDestination}&sender=${SENDER}&content=${encodeURIComponent(content)}&urgency=true`;

    try {
      console.log(`[SMS] Sending to ${finalDestination}: ${content}`);
      const response = await fetch(url);
      const result = await response.text();
      console.log(`[SMS] Response:`, result);
      return result;
    } catch (error) {
      console.error('[SMS] Error sending SMS:', error);
      return null;
    }
  },

  /**
   * Sends birthday notifications using templates from settings.
   */
  sendBirthdayAlerts: async (employeeName: string, employeePhone: string) => {
    // Correctly await the async getSettings call
    const settings = await Database.getSettings();
    
    const replaceVars = (template: string) => {
        return template
            .replace(/{name}/g, employeeName)
            .replace(/{phone}/g, employeePhone || 'N/A');
    };

    // 1. Message to User
    if (employeePhone && settings.userSmsTemplate) {
      await SMSService.send(employeePhone, replaceVars(settings.userSmsTemplate));
    }

    // 2. Message to Admin
    if (settings.adminPhone && settings.adminSmsTemplate) {
      await SMSService.send(settings.adminPhone, replaceVars(settings.adminSmsTemplate));
    }

    // 3. Message to Accountant
    if (settings.accountantPhone && settings.accountantSmsTemplate) {
      await SMSService.send(settings.accountantPhone, replaceVars(settings.accountantSmsTemplate));
    }
  },

  sendBirthdayUpdateNotification: async (name: string, phoneNumber: string, newDate: string) => {
    if (!phoneNumber) return;
    const message = `Hello ${name}, your birthday has been successfully updated to ${newDate} in the Zenith Portal. Next update allowed in 1 year.`;
    return SMSService.send(phoneNumber, message);
  }
};
