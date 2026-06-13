import { LightningElement, wire } from 'lwc';
import getKYCRecords from '@salesforce/apex/KYCController.getKYCRecords';

export default class RiskHeatmap extends LightningElement {
  kycList = [];
  isLoading = false;

  @wire(getKYCRecords)
  wiredKYCs({ error, data }) {
    if (data) {
      this.kycList = data;
      this.isLoading = false;
    } else if (error) {
      console.error('Error loading KYCs:', error);
      this.isLoading = false;
    }
  }

  connectedCallback() {
    this.isLoading = true;
  }
}