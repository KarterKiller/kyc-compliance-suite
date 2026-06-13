import { LightningElement, wire } from 'lwc';
import getAuditLogs from '@salesforce/apex/KYCController.getAuditLogs';

export default class AuditLogViewer extends LightningElement {
  auditLogs = [];
  isLoading = true;

  @wire(getAuditLogs)
  wiredAuditLogs({ error, data }) {
    if (data) {
      this.auditLogs = [...data]
        .map(log => ({
          ...log,
          userName: log.User__r?.Name || 'N/A',
          clientName: log.KYC__r?.Client_Name__c || 'N/A',
          details: `${log.Old_Value__c || ''} → ${log.New_Value__c || ''}`
        }))
        .sort((a, b) =>
          new Date(b.Timestamp__c) - new Date(a.Timestamp__c)
        );

      this.isLoading = false;
    } else if (error) {
      console.error('Error loading audit logs:', error);
      this.isLoading = false;
    }
  }
}