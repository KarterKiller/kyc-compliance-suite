import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createKYC from '@salesforce/apex/KYCController.createKYC';
import checkPEPStatus from '@salesforce/apex/KYCController.checkPEPStatus';

export default class KycForm extends LightningElement {
  @track kycRecord = {
    Client_Name__c: '',
    Client_Email__c: '',
    Status__c: 'Draft',
    Risk_Score__c: 0,
    PEP_Status__c: 'Not PEP'
  };

  @track isLoading = false;
  @track pepStatusLabel = 'Not PEP';
  @track pepStatusVariant = 'success';

  statusOptions = [
    { label: 'Draft', value: 'Draft' },
    { label: 'Review', value: 'Review' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' }
  ];

  handleInputChange(event) {
    const field = event.target.dataset.field;
    this.kycRecord[field] = event.target.value;
  }

  handleStatusChange(event) {
    this.kycRecord.Status__c = event.detail.value;

    if (event.detail.value === 'Review') {
      this.checkPEPViaMuleSoft();
    }
  }

  checkPEPViaMuleSoft() {
    this.isLoading = true;
    checkPEPStatus({ clientName: this.kycRecord.Client_Name__c })
      .then(result => {
        if (result.isPEP) {
          this.kycRecord.PEP_Status__c = 'PEP';
          this.pepStatusLabel = '🚩 PEP DETECTED';
          this.pepStatusVariant = 'error';
          this.kycRecord.Risk_Score__c = 100;
        } else {
          this.kycRecord.PEP_Status__c = 'Not PEP';
          this.pepStatusLabel = '✅ Not PEP';
          this.pepStatusVariant = 'success';
        }
        this.isLoading = false;
      })
      .catch(error => {
        this.showToast('Error', error.body.message, 'error');
        this.isLoading = false;
      });
  }

  async handleSaveKYC() {
  console.log('Save clicked!');
  this.isLoading = true;

  try {
    const pepCheckResult = await checkPEPStatus({
      clientName: this.kycRecord.Client_Name__c
    });

    console.log('PEP Check Result:', pepCheckResult);

    if (pepCheckResult.isPEP) {
      this.kycRecord.PEP_Status__c = 'PEP';
      this.kycRecord.Risk_Score__c = 100;
      this.showToast('BLOCKED', `${this.kycRecord.Client_Name__c} is flagged as PEP!`, 'error');
      return;
    }

    const kycData = {
      Client_Name__c: this.kycRecord.Client_Name__c,
      Client_Email__c: this.kycRecord.Client_Email__c,
      Risk_Score__c: pepCheckResult.riskLevel === 'HIGH' ? 75 : 25,
      PEP_Status__c: 'Not PEP',
      Status__c: 'Review'
    };

    await createKYC({ kycData });

    this.showToast('Success', 'KYC created!', 'success');
    this.handleCancel();

  } catch (error) {
    const message = error?.body?.message || error?.message || 'Unknown error';
    this.showToast('Error', message, 'error');
  } finally {
    this.isLoading = false;
  }
}

  handleCancel() {
    this.kycRecord = {
      Client_Name__c: '',
      Client_Email__c: '',
      Status__c: 'Draft',
      Risk_Score__c: 0,
      PEP_Status__c: 'Not PEP'
    };
  }

  connectedCallback() {
  this.updateThemeFromSystem();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    this.updateThemeFromSystem();
  });
}

updateThemeFromSystem() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const container = this.template.querySelector('.form-container');
  if (container) {
    container.setAttribute('data-theme', isDark ? 'dark' : 'light');
    this.updateToggleIcon();
  }
}

toggleDarkMode() {
  const container = this.template.querySelector('.form-container');
  const currentTheme = container.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  container.setAttribute('data-theme', newTheme);
  this.updateToggleIcon();
}

updateToggleIcon() {
  const container = this.template.querySelector('.form-container');
  const icon = this.template.querySelector('.toggle-icon');
  if (icon && container) {
    const isDark = container.getAttribute('data-theme') === 'dark';
    icon.textContent = isDark ? '🌙' : '☀️';
  }
}

get isPEP() {
  return this.kycRecord.PEP_Status__c === 'PEP';
}


  showToast(title, message, variant) {
    this.dispatchEvent(
      new ShowToastEvent({
        title,
        message,
        variant
      })
    );
  }
}