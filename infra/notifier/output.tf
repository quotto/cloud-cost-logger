output "name" {
  value = aws_lambda_function.notifier.function_name
}

output "arn" {
    value = aws_lambda_function.notifier.arn
}