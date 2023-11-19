import {CloudWatchLogs} from "@aws-sdk/client-cloudwatch-logs";

const cloudwatchlogs = new CloudWatchLogs();
export const createLogStream = async (logGroup: string, prefix: string ,provider: string, year: number, month: number): Promise<void> => {
    const logStreamName =`${prefix}${provider}-${year}-${month.toString().padStart(2,'0')}`;
    try {
        const response = await cloudwatchlogs.createLogStream({
            logGroupName: logGroup,
            logStreamName: logStreamName
        });
        if(response.$metadata.httpStatusCode === 200) {
            console.log(`[INFO] ログストリーム ${logStreamName} を作成しました。`);
        } else {
            throw new Error(`ログストリーム作成エラー: ${response.$metadata.httpStatusCode?.toString()}`);
        }
    } catch (error) {
        console.log(`[ERROR] ログストリーム ${logStreamName} の作成に失敗しました。`);
        console.log(error);
        throw error;
    }


}