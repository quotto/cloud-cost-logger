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
exports.handler = void 0;
const axios_1 = __importDefault(require("axios"));
const handler = (event, context, callback) => __awaiter(void 0, void 0, void 0, function* () {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
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
        const response = yield axios_1.default.post(webhookUrl, payload, config);
        callback(JSON.stringify(response.data));
    }
    catch (error) {
        console.error(error);
        callback('error');
    }
});
exports.handler = handler;
