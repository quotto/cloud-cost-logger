# CloudCostLogger

クラウドプラットフォームの金額を記録するための仕組みです。

CloudWatch Logsに記録します。

## collector

1日1回、前日時点での1ヶ月間の累積課金額を取得してCloudWatchLogsに記録します。

スケジューリングはEvent Bridge、処理の実行はStep FunctionsとAWS Lambdaで実装します。

## logstream

毎月1日、その月のLogStreamを作成します。

スケジューリングはEvent Bridge、処理の実行はStep FunctionsとAWS Lambdaで実装します。

## notifier

エラー発生時にSlack通知を送るためのモジュールです。AWS Lambdaで実装します。