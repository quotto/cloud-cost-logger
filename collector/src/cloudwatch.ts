import {CloudWatchLogs} from "@aws-sdk/client-cloudwatch-logs";
import { PutLogEventsRequest } from "aws-sdk/clients/cloudwatchlogs";

export interface CostData {
    provider: string,
    cumulativeCost: number,
    currency: string,
    date: string,
    dateMillis: number
}


const cloudwatchlogs = new CloudWatchLogs();

export const postCloudWatch = async (logGroupName: string, provider: string, year: number, month: number,costData: CostData,logStreamPrefix?: string ): Promise<void> => {
    // CloudWatchのロググールプへログを送信
    const logStreamName = `${logStreamPrefix || ''}${provider}-${year}-${month.toString().padStart(2,'0')}`;
    const logEvents = [
        {
            timestamp: new Date().getTime(),
            message: JSON.stringify(costData),
        },
    ];
    const params: PutLogEventsRequest = {
        logEvents: logEvents,
        logGroupName: logGroupName,
        logStreamName: logStreamName
    };
    await cloudwatchlogs.putLogEvents(params).then((data) => {
        console.log(`[INFO] ${costData.provider} のログを送信しました。`);
    }).catch((error) => {
        console.log(`[ERROR] ${costData.provider} のログ送信に失敗しました。`);
        console.log(error);
    });
}