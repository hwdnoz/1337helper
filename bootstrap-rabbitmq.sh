#!/bin/bash
# intended for local env

# Start RabbitMQ in detached mode
rabbitmq-server -detached

# Wait for RabbitMQ to start
sleep 2

# Check RabbitMQ status
rabbitmqctl status

# Create RabbitMQ user for the application
rabbitmqctl add_user "1337helper" "1337helper"

# Set permissions for the user
rabbitmqctl set_permissions -p / "1337helper" ".*" ".*" ".*"

# Set user as administrator
rabbitmqctl set_user_tags "1337helper" administrator

echo "RabbitMQ setup complete!"
