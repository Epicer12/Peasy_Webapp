#!/bin/bash

# Configuration
CONFIG_PATH="/Users/jayathmimehansa/Peasy_Webapp/agent/configs/.env"

# Load environment variables
if [ -f "$CONFIG_PATH" ]; then
    export $(grep -v '^#' "$CONFIG_PATH" | xargs)
else
    echo "Config file not found: $CONFIG_PATH"
    exit 1
fi

echo "Starting Agent Services..."

# 1. Start Ollama (if not already running)
# Note: This assumes Ollama Desktop or command-line tool is installed
if ! pgrep -x "ollama" > /dev/null; then
    echo "Starting Ollama..."
    # If running macOS app, might need open -a Ollama
    # If using command line, might need to run ollama serve &
    # We'll just check if it's responsive here
    curl -s http://localhost:11434 > /dev/null || (echo "Ollama not running. Please start Ollama." && exit 1)
fi

# Ensure llama3 model is pulled
echo "Checking model $OLLAMA_MODEL..."
ollama pull $OLLAMA_MODEL

# 2. Start n8n
echo "Starting n8n on port $N8N_PORT..."
# npx n8n start --port $N8N_PORT &
# Storing n8n process ID to stop later
# (Alternatively, run n8n in its own terminal or as a service)
npx n8n start --port $N8N_PORT > /Users/jayathmimehansa/Peasy_Webapp/agent/n8n/n8n_log.txt 2>&1 &
echo $! > /Users/jayathmimehansa/Peasy_Webapp/agent/n8n/n8n.pid

# 3. Start ngrok
echo "Starting ngrok for n8n..."
if [ -n "$NGROK_AUTHTOKEN" ]; then
    ngrok http $N8N_PORT --log=stdout > /Users/jayathmimehansa/Peasy_Webapp/agent/scripts/ngrok_log.txt &
    echo $! > /Users/jayathmimehansa/Peasy_Webapp/agent/scripts/ngrok.pid
    
    # Give it a few seconds to initialize
    sleep 5
    
    # Try to extract the public URL (this is a bit of a hack)
    NGROK_URL_DETECTED=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
    echo "----------------------------------------------------"
    echo "NGROK Public Webhook URL: $NGROK_URL_DETECTED"
    echo "----------------------------------------------------"
else
    echo "NGROK_AUTHTOKEN not set. Ngrok not started."
fi

echo "Agent Started Successfully!"
