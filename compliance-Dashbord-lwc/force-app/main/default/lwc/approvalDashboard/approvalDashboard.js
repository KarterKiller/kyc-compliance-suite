import { LightningElement, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getKYCRecords from '@salesforce/apex/KYCController.getKYCRecords';
import updateKYCStatus from '@salesforce/apex/KYCController.updateKYCStatus';

export default class ApprovalDashboard extends LightningElement {
  @track kycList = [];
  @track selectedKYC = null;
  @track showModal = false;
  @track isLoading = false;

  @track totalKYC = 0;
  @track kycInReview = 0;
  @track kycApproved = 0;
  @track kycHighRisk = 0;

  wiredKYCResult;

  columns = [
    { label: 'Client Name', fieldName: 'Client_Name__c', type: 'text' },
    { label: 'Email', fieldName: 'Client_Email__c', type: 'email' },
    { label: 'Status', fieldName: 'Status__c', type: 'text' },
    { label: 'Risk Score', fieldName: 'Risk_Score__c', type: 'percent' },
    { label: 'PEP Status', fieldName: 'PEP_Status__c', type: 'text' },
    { label: 'Created', fieldName: 'CreatedDate', type: 'date' },
    {
      type: 'action',
      typeAttributes: {
        rowActions: [
          { label: 'View', name: 'view' },
          { label: 'Approve', name: 'approve' },
          { label: 'Reject', name: 'reject' }
        ]
      }
    }
  ];

  @wire(getKYCRecords)
  wiredKYC(result) {
    this.wiredKYCResult = result;
    if (result.data) {
      this.kycList = result.data;
      this.calculateStats();
    } else if (result.error) {
      console.error('Error loading KYC:', result.error);
    }
  }

  connectedCallback() {
  // Detect system dark mode preference
  this.updateThemeFromSystem();
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    this.updateThemeFromSystem();
  });
}

updateThemeFromSystem() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const container = this.template.querySelector('.dashboard-container');
  if (container) {
    container.setAttribute('data-theme', isDark ? 'dark' : 'light');
    this.updateToggleIcon();
  }
}

toggleDarkMode() {
  const container = this.template.querySelector('.dashboard-container');
  const currentTheme = container.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  container.setAttribute('data-theme', newTheme);
  this.updateToggleIcon();
}

updateToggleIcon() {
  const container = this.template.querySelector('.dashboard-container');
  const icon = this.template.querySelector('.toggle-icon');
  if (icon && container) {
    const isDark = container.getAttribute('data-theme') === 'dark';
    icon.textContent = isDark ? '🌙' : '☀️';
  }
}

handleModalContentClick(event) {
  event.stopPropagation();
}


  calculateStats() {
    this.totalKYC = this.kycList.length;
    this.kycInReview = this.kycList.filter(k => k.Status__c === 'Review').length;
    this.kycApproved = this.kycList.filter(k => k.Status__c === 'Approved').length;
    this.kycHighRisk = this.kycList.filter(k => k.Risk_Score__c >= 70).length;
  }

  handleRowAction(event) {
  const action = event.target.dataset.action;
  const kycId = event.target.dataset.kycId;

  // Trouve le KYC dans la liste
  const kyc = this.kycList.find(k => k.Id === kycId);
  
  if (!kyc) return;

  switch (action) {
    case 'view':
      this.selectedKYC = kyc;
      this.showModal = true;
      break;
    case 'approve':
      this.updateStatus(kycId, 'Approved');
      break;
    case 'reject':
      this.updateStatus(kycId, 'Rejected');
      break;
  }
}
  handleModalContentClick(event) {
  // Empêche la fermeture si on clique dans le contenu
  event.stopPropagation();
  }

  updateStatus(kycId, newStatus) {
    this.isLoading = true;
    updateKYCStatus({ kycId, newStatus })
      .then(() => {
        return refreshApex(this.wiredKYCResult);
      })
      .then(() => {
        this.isLoading = false;
        this.showToast('Success', `KYC ${newStatus}`, 'success');
      })
      .catch(error => {
        this.isLoading = false;
        console.error('Error:', error);
      });
  }

  closeModal() {
    this.showModal = false;
  }

  showToast(title, message, variant) {
    this.dispatchEvent(
      new ShowToastEvent({ title, message, variant })
    );
  }
}