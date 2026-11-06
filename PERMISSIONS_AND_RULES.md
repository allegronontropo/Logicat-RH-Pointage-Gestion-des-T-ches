## Business rules — attendance state machine
1. Check-in required before any break or check-out.
2. Exactly one check-in and one check-out per day (UNIQUE user_id+date).
3. A break must end before another starts (max one active break).
4. Check-out forbidden while a break is active.
5. Each break type (MORNING/LUNCH/EVENING) once per day (UNIQUE attendance_id+type).
6. Employee cannot modify historical attendance.
7. Admin cannot edit attendance hours — only declare absences.
8. Admin cannot deactivate self, nor the last active ADMIN_RH.

## Calculations
- presence = check_out − check_in
- breaks_total = Σ(end_time − start_time) across the day's breaks
- effective = presence − breaks_total
- Example (must reproduce exactly): 09:00→18:00, breaks 15+60+15 min → presence 9h, breaks 1h30, effective 7h30.