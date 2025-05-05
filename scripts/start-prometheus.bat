@echo off
echo Starting Prometheus...
cd /d "%~dp0\..\prometheus"
start prometheus.exe --config.file=..\prometheus.yml
 
echo Prometheus started. Access the web interface at http://localhost:9090 