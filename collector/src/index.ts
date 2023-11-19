import { Context } from '@aws-sdk/client-cost-explorer';
import { postCloudWatch } from './cloudwatch';
import { CostApi, CostApiFactory, ProviderCostData } from './cost-api';
import { Callback } from 'aws-lambda';

interface StateMachineEvent {
    Provider: string,
    Year: number,
    Month: number,
    LogGroup: string,
    LogStreamPrefix?: string
}

export const handler = async (event: StateMachineEvent, context: Context, callback: Callback) => {
    // Asia/Tokyoのタイムゾーンに合わせて時間を加算してDateオブジェクトを生成
    const now = new Date();
    const nowInTokyo = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    // 昨日の年月を取得
    const yesterday = new Date(nowInTokyo.getFullYear(), nowInTokyo.getMonth(), nowInTokyo.getDate() - 1);
    const targetYear = yesterday.getFullYear();
    const targetMonth = yesterday.getMonth() + 1;


    try {
        const CostApi: CostApi = CostApiFactory(event.Provider);
        const providerCostData: ProviderCostData = await CostApi.run(targetYear, targetMonth);
        const yesterdayDateString = yesterday.toISOString().slice(0,10)
        const costData = {
            provider: providerCostData.provider,
            cumulativeCost: providerCostData.cumulativeCost,
            currency: providerCostData.currency,
            date: yesterdayDateString,
            dateMillis: yesterday.getTime()
        };
        await postCloudWatch(event.LogGroup, event.Provider, targetYear, targetMonth, costData, event.LogStreamPrefix);
        callback(null, costData)
    } catch (error) {
        console.log(error);
        callback("error");
    }
}