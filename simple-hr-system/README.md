# Simple HR System

A lightweight browser-based HR system with local storage persistence.

## Features
- Employee management: add, edit, delete, search
- Leave management: create requests, approve/reject, filter by status
- Dashboard metrics for employees and leave status totals
- Demo data seeding for quick testing

## Run
1. From this directory, start a local server:
   - `python3 -m http.server 8000`
2. Open `http://localhost:8000` in your browser.

## Notes
- Data is stored in browser `localStorage` under key `simple-hr-system-data-v1`.
- Deleting an employee also deletes their leave requests.
