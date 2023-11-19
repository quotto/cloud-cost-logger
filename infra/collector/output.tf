output "collector_state_machine_arn" {
  value = aws_sfn_state_machine.cost_collection_state_machine.arn
}