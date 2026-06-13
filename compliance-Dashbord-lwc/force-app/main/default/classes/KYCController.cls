public with sharing class KYCController {
  
  @AuraEnabled
  public static KYC__c createKYC(Map<String, Object> kycData) {
    KYC__c kyc = new KYC__c();
    kyc.Client_Name__c = (String) kycData.get('Client_Name__c');
    kyc.Client_Email__c = (String) kycData.get('Client_Email__c');
    kyc.Status__c = (String) kycData.get('Status__c');
    kyc.Risk_Score__c = (Decimal) kycData.get('Risk_Score__c');
    kyc.PEP_Status__c = (String) kycData.get('PEP_Status__c');
    
    insert kyc;
    
    // Log audit
    createAuditLog(kyc.Id, 'KYC Created', null, 'Created');
    
    return kyc;
  }

  @AuraEnabled(cacheable=true)
public static List<KYC__c> getKYCRecords() {
  try {
    return [
      SELECT Id, Client_Name__c, Client_Email__c, Status__c, Risk_Score__c
      FROM KYC__c
      ORDER BY CreatedDate DESC
      LIMIT 100
    ];
  } catch (Exception e) {
    System.debug('ERROR: ' + e.getMessage());
    throw new AuraHandledException(e.getMessage());
  }
}

  @AuraEnabled
  public static void updateKYCStatus(String kycId, String newStatus) {
    KYC__c kyc = [SELECT Id, Status__c FROM KYC__c WHERE Id = :kycId];
    String oldStatus = kyc.Status__c;
    kyc.Status__c = newStatus;
    update kyc;
    
    // Log audit
    createAuditLog(kycId, 'Status Changed', oldStatus, newStatus);
  }

@AuraEnabled
public static Map<String, Object> checkPEPStatus(String clientName) {
    try {
        String endpoint = 'https://pep-checker-api-lxelir.5sc6y6-3.usa-e2.cloudhub.io/pep-check?name=' + 
                          EncodingUtil.urlEncode(clientName, 'UTF-8');
        
        System.debug('Calling endpoint: ' + endpoint);
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json');
        req.setTimeout(10000);
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        System.debug('Response Status: ' + res.getStatusCode());
        System.debug('Response Body: ' + res.getBody());
        
        if (res.getStatusCode() == 200) {
            Map<String, Object> responseBody = (Map<String, Object>) 
                JSON.deserializeUntyped(res.getBody());
            
            Map<String, Object> result = new Map<String, Object>();
            result.put('isPEP', (Boolean) responseBody.get('isPEP'));
            result.put('riskLevel', (String) responseBody.get('riskLevel'));
            result.put('results', responseBody.get('results'));
            
            return result;
        } else {
            throw new AuraHandledException('PEP Check failed: ' + res.getStatusCode() + ' ' + res.getBody());
        }
    } catch (Exception e) {
        System.debug('Exception: ' + e.getMessage());
        System.debug('Stack: ' + e.getStackTraceString());
        throw new AuraHandledException('Error: ' + e.getMessage());
    }
}

  private static void createAuditLog(String kycId, String action, String oldVal, String newVal) {
    AuditLog__c log = new AuditLog__c();
    log.KYC__c = kycId;
    log.Action__c = action;
    log.Old_Value__c = oldVal;
    log.New_Value__c = newVal;
    log.Timestamp__c = System.now();
    log.User__c = UserInfo.getUserId();
    
    insert log;
  }

@AuraEnabled(cacheable=true)
public static List<AuditLog__c> getAuditLogs() {
    try {
        return [
            SELECT Id, Action__c, Old_Value__c, New_Value__c, Timestamp__c,
            KYC__c, KYC__r.Client_Name__c
            FROM AuditLog__c
            ORDER BY Timestamp__c DESC
            LIMIT 100
        ];
    } catch (Exception e) {
        throw new AuraHandledException(e.getMessage());
    }
}


}