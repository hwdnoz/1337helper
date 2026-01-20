#!/bin/bash

set -e

if [ -z "$RABBITMQ_USER" ] || [ -z "$RABBITMQ_PASS" ]; then
    echo "❌ RABBITMQ_USER or RABBITMQ_PASS not set in environment"
    exit 1
fi

# Check if RabbitMQ is running
if ! pgrep -f rabbitmq-server > /dev/null 2>&1; then
    echo "❌ RabbitMQ is not running. Please start RabbitMQ first."
    exit 1
fi

# Try to create user (will fail if already exists, that's ok)
sudo rabbitmqctl add_user "$RABBITMQ_USER" "$RABBITMQ_PASS" 2>/dev/null || echo "✓ User already exists"
sudo rabbitmqctl set_permissions -p / "$RABBITMQ_USER" ".*" ".*" ".*"
sudo rabbitmqctl set_user_tags "$RABBITMQ_USER" administrator

echo "✓ RabbitMQ user '$RABBITMQ_USER' configured"
