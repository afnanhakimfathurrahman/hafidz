#!/data/data/com.termux/files/usr/bin/bash
# Stop the game server started by start.sh.
PID_FILE="$PREFIX/tmp/hafiz-kecil.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  kill "$(cat "$PID_FILE")" && echo "Stopped (PID $(cat "$PID_FILE"))."
  rm -f "$PID_FILE"
  exit 0
fi
rm -f "$PID_FILE"

# Fallback: a server started some other way (e.g. npm run preview)
PIDS=""
for pid in $(pgrep -x node); do
  tr '\0' ' ' <"/proc/$pid/cmdline" 2>/dev/null | grep -q "vite.js preview" && PIDS="$PIDS $pid"
done
PIDS=$(echo $PIDS)
if [ -n "$PIDS" ]; then
  kill $PIDS && echo "Stopped (PID $PIDS)."
else
  echo "Server is not running."
fi
