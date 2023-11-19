import { Context } from 'aws-lambda';
import { createLogStream } from './cloudwatch';
import { Callback } from 'aws-lambda';

interface StateMachineEvent {
    LogGroup: string,
    LogStreamPrefix?: string,
    Provider: string
}

export const handler = async function getBillingAmounts(event: StateMachineEvent, context: Context, callback: Callback) {
    // Asia/Tokyoのタイムゾーンに合わせて時間を加算してDateオブジェクトを生成
    const now = new Date();
    const nowInTokyo = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    try {
        await createLogStream(event.LogGroup, event.LogStreamPrefix || '', event.Provider, nowInTokyo.getFullYear(), nowInTokyo.getMonth() + 1);
        callback(null, "success");
    } catch (error) {
        console.log(error);
        callback("error");
    }
}