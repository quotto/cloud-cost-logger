import { CostManagementClient } from "@azure/arm-costmanagement";
import { ClientSecretCredential, DefaultAzureCredential } from "@azure/identity";
import {CostExplorer} from "@aws-sdk/client-cost-explorer";
import { BigQuery } from "@google-cloud/bigquery";

export interface ProviderCostData {
    provider: string,
    currency: string,
    cumulativeCost: number
}

export interface CostApi {
    run(targetYear: number, targetMonth: number): Promise<ProviderCostData>;
}

export const CostApiFactory = (provider: string): CostApi => {
    switch (provider) {
        case 'AWS':
            return new AwsCostApi();
        case 'Azure':
            return new AzureCostApi();
        case 'GCP':
            return new GcpCostAPi();
        default:
            throw new Error(`[ERROR] 不明なプラットフォームです。: ${provider}`);
    }
}

class AzureCostApi implements CostApi {
    constructor() {}
    async run(targetYear: number, targetMonth: number): Promise<ProviderCostData> {
        // 対象月の月初日を取得
        const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
        // 対象月の月末日を取得
        const endOfMonth = new Date(targetYear, targetMonth, 0);

        // ClientSecretCredentialに必要な環境変数が設定されているかチェック
        if (!process.env['AZURE_TENANT_ID'] || !process.env['AZURE_CLIENT_ID'] || !process.env['AZURE_CLIENT_SECRET']) {
            throw new Error('[ERROR] Azureの認証情報が設定されていません。');
        }

        const credential = new ClientSecretCredential(process.env['AZURE_TENANT_ID'], process.env['AZURE_CLIENT_ID'], process.env['AZURE_CLIENT_SECRET']);
        const client = new CostManagementClient(credential);

        // AzureのサブスクリプションIDが設定されているかチェック
        if (!process.env['AZURE_SUBSCRIPTION_ID']) {
            throw new Error('[ERROR] AzureのサブスクリプションIDが設定されていません。');
        }
        const subscriptionId = process.env['AZURE_SUBSCRIPTION_ID'];
        const response = await client.query.usage(`/subscriptions/${subscriptionId}/`, { type: 'ActualCost', timeframe: 'Custom', dataset: { granularity: 'Daily', aggregation: { totalCost: { name: 'PreTaxCost', function: 'Sum' } } }, timePeriod: { from: startOfMonth, to: endOfMonth } });
        console.log(JSON.stringify(response));

        const total = response.rows?.reduce((total, row) => total + row[0], 0)
        const costData: ProviderCostData = {
            provider: 'azure',
            cumulativeCost: Number(total),
            currency: 'JPY'
        };
        console.log(JSON.stringify(costData))
        return costData;
    }
}

class AwsCostApi implements CostApi {
    constructor() {}
    async run(targetYear: number, targetMonth: number): Promise<ProviderCostData> {
        // const awsCredentials = new AWS.Credentials)
        const awsCostExplorer = new CostExplorer({ region: 'us-east-1' });
        // 対象月の月初日をYYYY-MM-DD形式で取得
        const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
        const startOfMonthString = startOfMonth.toISOString().slice(0, 10);

        // 対象月の月末日をYYYY-MM-DD形式で取得
        const endOfMonth = new Date(targetYear, targetMonth, 0);
        const endOfMonthString = endOfMonth.toISOString().slice(0, 10);

        const awsResult = await awsCostExplorer.getCostAndUsage({
            TimePeriod: {
                Start: startOfMonthString,
                End: endOfMonthString,
            },
            Granularity: 'MONTHLY',
            Metrics: ['UnblendedCost'],
        });
        console.log(JSON.stringify(awsResult));

        const costData: ProviderCostData = {
            provider: 'aws',
            cumulativeCost: Number(awsResult.ResultsByTime?.reduce((total, result) => total + Number(result.Total!['UnblendedCost']['Amount'] || 0), 0)),
            currency: 'USD'
        };
        console.log(JSON.stringify(costData));

        return costData;
    }
}

class GcpCostAPi implements CostApi {
    constructor() {}
    async run(targetYear: number, targetMonth: number): Promise<ProviderCostData> {
        const bigquery = new BigQuery();
        const startOfMonthString = String(targetYear) + String(targetMonth).padStart(2, '0');
        const queery = `SELECT
  invoice.month,
  SUM(cost)
    + SUM(IFNULL((SELECT SUM(c.amount)
                  FROM UNNEST(credits) c), 0))
    AS total,
  (SUM(CAST(cost AS NUMERIC))
    + SUM(IFNULL((SELECT SUM(CAST(c.amount AS NUMERIC))
                  FROM UNNEST(credits) AS c), 0)))
    AS total_exact
FROM \`standard_billing_dataset.gcp_billing_export_v1_01C958_727657_C90D16\`
WHERE invoice.month = @startOfMonthString
GROUP BY 1
ORDER BY 1 ASC
;`

        const options = {
            query: queery,
            location: 'asia-northeast1',
            params: {
                startOfMonthString: startOfMonthString
            }
        };

        const [job] = await bigquery.createQueryJob(options);
        console.log(`Job ${job.id} started.`);

        const [rows] = await job.getQueryResults();

        console.log(rows[0]);

        return {
            provider: 'gcp',
            cumulativeCost: Number(rows[0].total),
            currency: 'JPY'
        }
    }
}