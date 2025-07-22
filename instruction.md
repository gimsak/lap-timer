# Mini 4WD Lap Timer Instructions

## Input Controls

### Camera Zoom (1x - 3x)
- Adjusts the camera zoom level for better car detection
- Use the slider to find the optimal zoom level for your track setup
- Changes take effect immediately

### Number of Tracks (2-5)
- Sets how many track lanes to monitor
- Each track gets its own status card
- Minimum: 2 tracks
- Maximum: 5 tracks

### Time Limit
- Sets the maximum race duration
- Format:
  - Minutes (0-59)
  - Seconds (0-59)
  - Milliseconds (0-999)
- Default: 20 seconds
- Race automatically ends when time limit is reached

## Button Controls

### Start (Keyboard: A)
- Initiates race setup
- Turns start lights from red to green
- Timer begins automatically when first car is detected
- All tracks begin monitoring for car movement

### Final Lap (Keyboard: S)
- Available only during active race
- Marks current lap as the final lap
- First car to cross after this becomes the winner
- Other cars can still finish until time limit
- Cars that don't finish before time limit are marked DNF

### Reset (Keyboard: D)
- Clears all race data and starts fresh
- Available during or after race
- Resets start lights to red
- Clears winner snapshot
- Shows live camera feed again

## Race Logic

### Race Start
1. Press Start button (or 'A' key)
2. Start lights turn green
3. Timer begins on first car detection
4. All tracks show "Running" status

### During Race
- Each track shows "Running" status
- No times are displayed until cars finish
- Live camera feed shows current race
- Timer counts up from first detection

### Final Lap Phase
1. Press Final Lap button (or 'S' key)
2. First car to finish becomes winner
3. Winner's crossing moment is captured
4. Live feed switches to winner snapshot
5. Race continues for other cars until time limit

### Race End Conditions
1. Time limit reached
   - All unfinished cars marked DNF
   - Race status auto-scrolls into view
2. All cars finish before time limit
   - Race continues until time limit
   - Finished cars show completion times

### DNF (Did Not Finish) Conditions
- Car doesn't finish before time limit
- No time shown for DNF cars
- Status card shows DNF instead of time

## Additional Features

### Start Lights
- Three large lights above timer
- Red when ready/reset
- Green when race starts
- Helps racers with visual start signal

### Winner Snapshot
- Captures moment winner crosses line
- Displays above live camera feed
- Shows winner's track number
- Remains until race reset

### Fullscreen Mode
- Button in top-right corner
- Maximizes view for better visibility
- Great for race events and demonstrations

### Keyboard Shortcuts
- A: Start Race
- S: Final Lap
- D: Reset Race

### Support Features
- Donate button opens Saweria support options
- Leaderboard shows top supporters