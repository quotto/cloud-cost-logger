"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillingAmounts = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const identity_1 = require("@azure/identity");
const arm_costmanagement_1 = require("@azure/arm-costmanagement");
function getAzureBillingAmounts() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const subscriptionId = process.env['AZURE_SUBSCRIPTION_ID'];
        const credential = new identity_1.DefaultAzureCredential();
        const client = new arm_costmanagement_1.CostManagementClient(credential);
        const response = yield client.query.usage(`/subscriptions/${subscriptionId}/`, { type: 'ActualCost', timeframe: 'MonthToDate', dataset: { granularity: 'Daily', aggregation: { totalCost: { name: 'PreTaxCost', function: 'Sum' } } } });
        const total = (_a = response.rows) === null || _a === void 0 ? void 0 : _a.reduce((total, row) => total + row[0], 0);
        const costData = {
            platform: 'azure',
            amount: Number(total),
            currency: 'JPY',
            date: new Date().toISOString().slice(0, 10),
        };
        return costData;
    });
}
function getAwsBillingAmounts() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        // const awsCredentials = new AWS.Credentials)
        const awsCostExplorer = new aws_sdk_1.default.CostExplorer({ region: 'us-east-1' });
        // 今月1日をYYYY-MM-DD形式で取得
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfMonthString = startOfMonth.toISOString().slice(0, 10);
        // 月末日をYYYY-MM-DD形式で取得
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const endOfMonthString = endOfMonth.toISOString().slice(0, 10);
        const awsResult = yield awsCostExplorer.getCostAndUsage({
            TimePeriod: {
                Start: startOfMonthString,
                End: endOfMonthString,
            },
            Granularity: 'MONTHLY',
            Metrics: ['UnblendedCost'],
        }).promise();
        console.log(JSON.stringify(awsResult));
        const costData = {
            platform: 'aws',
            amount: Number((_a = awsResult.ResultsByTime) === null || _a === void 0 ? void 0 : _a.reduce((total, result) => total + Number(result.Total['UnblendedCost']['Amount'] || 0), 0)),
            currency: 'USD',
            date: startOfMonthString
        };
        console.log(JSON.stringify(costData));
        return costData;
    });
}
getAwsBillingAmounts();
function getGcpBillingAmounts() {
    return __awaiter(this, void 0, void 0, function* () {
        // const client = new CloudBillingClient();
        // client.listProjectBillingInfo().then(([projectBillingInfo]) => {
        //     const projectId = projectBillingInfo.projectId;
        //     const billingAccountName = projectBillingInfo.billingAccountName;
        //     const billingEnabled = projectBillingInfo.billingEnabled;
        //     console.log(`Project ID: ${projectId}`);
        //     console.log(`Billing Account Name: ${billingAccountName}`);
        //     console.log(`Billing Enabled: ${billingEnabled}`);
        // }
        // const gcpCredentials = {
        //     client_email: process.env['GCP_CLIENT_EMAIL'],
        //     private_key: process.env['GCP_PRIVATE_KEY'],
        // };
        // const gcpRestClient = new RestClient('gcp-billing-api');
        // const gcpResult = await gcpRestClient.get<number>(`https://cloudbilling.googleapis.com/v1/projects/${process.env['GCP_PROJECT_ID']}/billingAccounts/${process.env['GCP_BILLING_ACCOUNT_ID']}/transactions?filter=cost_type%3A%22COST_TYPE_UNSPECIFIED%22%20AND%20date_time%3E%3D%222022-01-01T00%3A00%3A00Z%22%20AND%20date_time%3C%3D%222022-01-31T23%3A59%3A59Z%22`);
        // const gcpAmount = gcpResult.result.reduce((total, transaction) => total + transaction.costs[0].amount, 0);
        // return gcpAmount;
    });
}
function getBillingAmounts() {
    return __awaiter(this, void 0, void 0, function* () {
        // AWS
        // const awsAmount = awsResult.ResultsByTime[0].Total.UnblendedCost.Amount;
        // // Azure
        // const azureCredentials = new Credentials({
        //     client_id: 'YOUR_AZURE_CLIENT_ID',
        //     client_secret: 'YOUR_AZURE_CLIENT_SECRET',
        //     tenant_id: 'YOUR_AZURE_TENANT_ID',
        // });
        // const azureRestClient = new RestClient('azure-billing-api');
        // const azureResult = await azureRestClient.get<number>(`https://management.azure.com/subscriptions/YOUR_AZURE_SUBSCRIPTION_ID/providers/Microsoft.CostManagement/query?api-version=2019-11-01&$filter=properties/UsageStart ge '2022-01-01' and properties/UsageEnd le '2022-01-31'&$apply=sum(properties/UsageQuantity)`);
        // const azureAmount = azureResult.result;
        // // GCP
        // const gcpCredentials = {
        //     client_email: 'YOUR_GCP_CLIENT_EMAIL',
        //     private_key: 'YOUR_GCP_PRIVATE_KEY',
        // };
        // const gcpRestClient = new RestClient('gcp-billing-api');
        // const gcpResult = await gcpRestClient.get<number>(`https://cloudbilling.googleapis.com/v1/projects/YOUR_GCP_PROJECT_ID/billingAccounts/YOUR_GCP_BILLING_ACCOUNT_ID/transactions?filter=cost_type%3A%22COST_TYPE_UNSPECIFIED%22%20AND%20date_time%3E%3D%222022-01-01T00%3A00%3A00Z%22%20AND%20date_time%3C%3D%222022-01-31T23%3A59%3A59Z%22`);
        // const gcpAmount = gcpResult.result.reduce((total, transaction) => total + transaction.costs[0].amount, 0);
        return { aws: 0, azure: 0, gcp: 0 };
    });
}
exports.getBillingAmounts = getBillingAmounts;
