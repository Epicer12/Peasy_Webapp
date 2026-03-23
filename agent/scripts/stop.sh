#!/bin/bash

# Configuration
# Staring by stopping n8n
if [ -f "/Users/jayathmimehansa/Peasy_Webapp/agent/n8n/n8n.pid" ]; then
    echo "Stopping n8n..."
    PID=$(cat /Users/jayathmimehansa/Peasy_Webapp/agent/n8n/n8n.pid)
    kill $PID
    rm /Users/jayathmimehansa/Peasy_Webapp/agent/n8n/n8n.pid
fi

# Stopping ngrok
if [ -f "/Users/jayathmimehansa/Peasy_Webapp/agent/scripts/ngrok.pid" ]; then
    echo "Stopping ngrok..."
    PID=$(cat /Users/jayathmimehansa/Peasy_Webapp/agent/scripts/ngrok.pid)
    kill $PID
    rm /Users/jayathmimehansa/Peasy_Webapp/agent/scripts/ngrok.pid
fi

# Not stopping Ollama since it might be needed for other things
# but we could if we wanted to
# killall ollama 

echo "Agent Services Stopped Successfully!"
