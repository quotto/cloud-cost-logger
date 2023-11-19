terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.24"
    }
  }

  required_version = ">= 1.2.0"
}

data "archive_file" "logstream_creator_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../logstream"
  output_path = "${path.root}/../logstream/logstream_creator.zip"
  excludes = ["src","*.zip"]
}

variable "notifier_function_arn" {
  type = string
}

resource "aws_cloudwatch_event_rule" "monthly_trigger" {
  name                = "ccl-logstream-creation"
  schedule_expression = "cron(0 0 1 * ? *)" # Asia/Tokyoのタイムゾーンで毎月1日の9時にトリガー
  role_arn = aws_iam_role.event_bridge_role.arn
}

// イベントブリッジとステートマシンの接続
resource "aws_cloudwatch_event_target" "monthly_sfn_target" {
  rule      = aws_cloudwatch_event_rule.monthly_trigger.name
  target_id = "LogstreamStateMachineTarget"
  arn       = aws_sfn_state_machine.logstream_state_machine.arn
  role_arn = aws_iam_role.event_bridge_role.arn
}

resource "aws_iam_role" "event_bridge_role" {
  name = "ccl-logstream-event-bridge-role"
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

resource "aws_lambda_function" "logstream_creator" {
  function_name = "ccl-logstream"
  role     = aws_iam_role.logstream_creator_role.arn
  filename = "${path.root}/../logstream/logstream_creator.zip"
  handler = "dist/index.handler"
  runtime = "nodejs18.x"
  source_code_hash = "${data.archive_file.logstream_creator_zip.output_base64sha256}"
}

resource "aws_iam_role" "logstream_creator_role" {
  name = "ccl-logstream-lambda-role"
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

resource "aws_iam_role_policy_attachment" "logstream_creator_policy_attach" {
  role       = aws_iam_role.logstream_creator_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_permission" "allow_state_machine_logstream_creator" {
  statement_id  = "AllowExecutionFromStepFunctions"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.logstream_creator.function_name
  principal     = "states.amazonaws.com" // AWS Step Functionsのサービスプリンシパル

  // Step Functionsが関数を起動する際に使用するARN
  source_arn    = aws_sfn_state_machine.logstream_state_machine.arn
}

resource "aws_sfn_state_machine" "logstream_state_machine" {
  name     = "ccl-logstream-state-machine"
  role_arn = aws_iam_role.state_machine_role.arn

  definition = templatefile("${path.module}/logstream_state_machine.tftpl", {
    function_arn = aws_lambda_function.logstream_creator.arn
    notifier_function_arn = var.notifier_function_arn
  })

}

resource "aws_iam_role" "state_machine_role" {
  name = "ccl-logstream-state-machine-role"
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

resource "aws_iam_policy" "state_machine_policy" {
  policy = jsonencode({
    Version : "2012-10-17",
    Statement: [
      {
        Action: [
          "lambda:InvokeFunction"
        ],
        Resource: [
          aws_lambda_function.logstream_creator.arn
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
