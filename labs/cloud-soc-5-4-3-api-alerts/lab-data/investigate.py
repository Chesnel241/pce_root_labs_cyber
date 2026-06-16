#!/usr/bin/env python3
import sys

FLAG = "PCE{Suspicious_API_Calls_Detected_2026}"
CORRECT_EVENT_ID = "evt-005"

if len(sys.argv) != 2:
    print("Usage: python3 investigate.py <eventID>")
    sys.exit(1)

event_id = sys.argv[1].strip()

if event_id == CORRECT_EVENT_ID:
    print(f"Correct! The DeleteTrail API call is highly suspicious. Here is your flag: {FLAG}")
else:
    print("Incorrect eventID or the event is not the primary suspicious activity. Keep looking!")
