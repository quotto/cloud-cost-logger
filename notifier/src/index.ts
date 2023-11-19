import { Callback, Context } from 'aws-lambda';
import axios from 'axios';

interface StateMachineEvent {
    message: string
}
export const handler = async (event: StateMachineEvent, context: Context, callback: Callback) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if(!webhookUrl) {
        console.log('[ERROR] SlackのWebhook URLが設定されていません。');
        callback('error');
    }
    const message = event.message;

    const payload = {
        text: message
    };

    const config = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await axios.post(webhookUrl!, payload, config);
        callback(JSON.stringify(response.data));
    } catch (error) {
        console.error(error);
        callback('error');
    }
};