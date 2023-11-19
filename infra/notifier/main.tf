data "archive_file" "function_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../notifier"
  output_path ="${path.root}/../notifier/notifier.zip"
  excludes = ["src"]
}

resource "aws_lambda_function" "notifier" {
    function_name = "ccl-notifier"
    role         = aws_iam_role.cloud_cost_notifier_role.arn
    filename = "${path.root}/../notifier/notifier.zip"
    handler = "dist/index.handler"
    runtime = "nodejs18.x"
    source_code_hash = "${data.archive_file.function_zip.output_base64sha256}"
}

resource "aws_iam_role" "cloud_cost_notifier_role" {
  name = "ccl-notifier-lambda-role"
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

resource "aws_iam_role_policy_attachment" "cloud_cost_notifier_policy_attach" {
  role       = aws_iam_role.cloud_cost_notifier_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

output "name" {
  value = aws_lambda_function.notifier.function_name
}

output "arn" {
    value = aws_lambda_function.notifier.arn
}