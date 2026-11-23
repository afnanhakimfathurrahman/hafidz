#!/data/data/com.termux/files/usr/bin/bash
# Start the game server in the background on port 8080.
# Usage: bash start.sh            (serve the current build)
#        bash start.sh --build    (rebuild first, use after changing code)
cd "$(dirname "$0")" || exit 1
PORT=8080
PID_FILE="$PREFIX/tmp/hafiz-kecil.pid"
LOG_FILE="server.log"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Already running (PID $(cat "$PID_FILE")) at http://localhost:$PORT"
  exit 0
fi

if [ "$1" = "--build" ] || [ ! -f dist/index.html ]; then
  echo "Building..."
  npm run -s build >/dev/null || { echo "Build failed. Run 'npm run build' to see errors."; exit 1; }
fi

setsid nohup node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port "$PORT" --strictPort >"$LOG_FILE" 2>&1 </dev/null &
echo $! >"$PID_FILE"
sleep 3

if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Server failed to start. See $LOG_FILE:"
  tail -5 "$LOG_FILE"
  rm -f "$PID_FILE"
  exit 1
fi

IP=$(ifconfig 2>/dev/null | awk '/inet /{print $2}' | grep -v '^127\.' | head -1)
echo "Petualangan Hafiz Kecil is running (PID $(cat "$PID_FILE"))"
echo "  This phone:  http://localhost:$PORT"
[ -n "$IP" ] && echo "  Same Wi-Fi:  http://$IP:$PORT"
echo "Stop with: bash stop.sh"
