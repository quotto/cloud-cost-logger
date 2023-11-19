terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.24"
    }
  }

  required_version = ">= 1.2.0"
}

variable "azure_client_id" {
  type = string
}

variable "azure_client_secret" {
  type = string
}

variable "azure_subscription_id" {
  type = string
}

variable "azure_tenant_id" {
  type = string
}

variable "notifier_function_arn" {
  type = string
}

data "archive_file" "cost_collector_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../collector"
  output_path = "${path.root}/../collector/cost_collector.zip"
  excludes = ["src"]
}

resource "aws_cloudwatch_event_rule" "daily_trigger" {
  name                = "ccl-collector-event-bridge-rule"
  schedule_expression = "cron(0 15 * * ? *)" # Terraformからタイムゾーンが指定できないためAsia/Tokyoの0時に合わせてUTC時刻を指定
  role_arn = aws_iam_role.event_bridge_role.arn
}

resource "aws_cloudwatch_event_target" "daily_sfn_target" {
  rule      = aws_cloudwatch_event_rule.daily_trigger.name
  target_id = "CollectorStateMachineTarget"
  arn       = aws_sfn_state_machine.cost_collection_state_machine.arn
  role_arn = aws_iam_role.event_bridge_role.arn
}

resource "aws_iam_role" "event_bridge_role" {
  name = "ccl-collector-event-bridge-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "events.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "event_bridge_policy_attach" {
  role       = aws_iam_role.event_bridge_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSStepFunctionsFullAccess"
}

resource "aws_lambda_function" "cost_collector" {
  function_name = "ccl-collector"
  role     = aws_iam_role.cost_collector_role.arn
  filename = "${path.root}/../collector/cost_collector.zip"
  handler = "dist/index.handler"
  runtime = "nodejs18.x"
  source_code_hash = "${data.archive_file.cost_collector_zip.output_base64sha256}"
  environment {
    variables = {
      AZURE_CLIENT_ID = var.azure_client_id
      AZURE_CLIENT_SECRET = var.azure_client_secret
      AZURE_SUBSCRIPTION_ID = var.azure_subscription_id
      AZURE_TENANT_ID = var.azure_tenant_id
      GOOGLE_APPLICATION_CREDENTIALS = "/var/task/serviceaccount-key.json"

    }
  }
  timeout = 10
}

resource "aws_iam_role" "cost_collector_role" {
  name = "ccl-collector-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_policy" "cost_policy" {
  name = "ccl-collector-lambda-policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "ce:DescribeCostCategoryDefinition",
          "ce:GetRightsizingRecommendation",
          "ce:GetCostAndUsage",
          "ce:GetSavingsPlansUtilization",
          "ce:GetAnomalies",
          "ce:GetReservationPurchaseRecommendation",
          "ce:ListCostCategoryDefinitions",
          "ce:GetCostForecast",
          "ce:GetPreferences",
          "ce:GetReservationUtilization",
          "ce:GetCostCategories",
          "ce:GetSavingsPlansPurchaseRecommendation",
          "ce:GetDimensionValues"
        ],
        Effect   = "Allow",
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cost_collector_policy_attach" {
  role       = aws_iam_role.cost_collector_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "cost_policy_attach" {
  role       = aws_iam_role.cost_collector_role.name
  policy_arn = aws_iam_policy.cost_policy.arn
}


resource "aws_sfn_state_machine" "cost_collection_state_machine" {
  name     = "ccl-collector-state-machine"
  role_arn = aws_iam_role.state_machine_role.arn
  definition = templatefile("${path.module}/collector_state_machine.tftpl", {
    function_arn = aws_lambda_function.cost_collector.arn,
    notifier_function_arn = var.notifier_function_arn
  })
}

resource "aws_iam_role" "state_machine_role" {
  name = "ccl-collector-state-machine-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "states.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_lambda_permission" "allow_state_machine_cost_collector" {
  statement_id  = "AllowExecutionFromStepFunctions"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cost_collector.function_name
  principal     = "states.amazonaws.com" // AWS Step Functionsのサービスプリンシパル

  // Step Functionsが関数を起動する際に使用するARN
  source_arn    = aws_sfn_state_machine.cost_collection_state_machine.arn
}

resource "aws_iam_policy" "state_machine_policy" {
  policy = jsonencode({
    Version : "2012-10-17",
    Statement: [
      {
        Action: [
          "lambda:InvokeFunction"
        ],
        Resource: [
          aws_lambda_function.cost_collector.arn
        ],
        Effect: "Allow"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "state_machine_policy_attach" {
  role       = aws_iam_role.state_machine_role.name
  policy_arn = aws_iam_policy.state_machine_policy.arn
}
