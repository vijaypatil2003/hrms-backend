# HRMS Backend

MERN Stack HRMS (Human Resource Management System) - Backend API

## Tech Stack
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs for password hashing
- pdfkit for salary slip PDF generation

## Setup Instructions

1. Clone the repo
```bash
git clone <repo-url>
cd hrms-backend
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file in root with:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRE=1d
```

4. Seed the first admin user (one-time, required since there is no public admin registration endpoint)
```bash
node src/utils/seedAdmin.js
```
This creates an admin with email `admin@hrms.com` and password `admin123`. Change this password after first login if needed (no change-password endpoint exists currently, see Known Limitations).

5. Run the server
```bash
npm run dev
```

Server runs on `http://localhost:5000`

## Live Deployment
Backend deployed at: https://hrms-backend-4r4p.onrender.com

Frontend deployed at: https://hrms-frontend-two-chi.vercel.app/

## Folder Structure
```
src/
  config/        - DB connection
  middleware/     - JWT auth and role check
  models/         - Mongoose schemas
  controllers/    - business logic
  routes/         - API route definitions
  utils/          - one-time scripts (seedAdmin)
```

## Documented Assumptions

Since the assignment PDF left several details open to interpretation, the following decisions were made:

1. **Leave balance reset**: Calculated per calendar year (Jan 1 - Dec 31), not employee joining anniversary.

2. **Leave balance calculation**: Computed live on every request (allotted - used), not stored as a separate counter field. This avoids sync bugs between leave approval and balance display, at the cost of recalculating on every call.

3. **Working days for payroll**: Calculated dynamically per month (total calendar days minus Saturdays, Sundays, and holidays), not a fixed number like 22.

4. **Employee creation - password**: Admin sets the employee's password directly when creating the employee record (no email/OTP service in scope). Employees can be given a "change password" feature in future, not implemented now.

5. **Half day leave vs attendance priority**: If an employee has an approved leave for a date, that takes priority over attendance/late mark calculation for that date. (Note: this priority check is not fully wired into attendance punch-in flow currently — see Known Limitations.)

6. **One payroll run per employee per month**: Enforced via a unique compound index (`employee + month + year`) on the Payroll collection to prevent duplicate payroll runs.

7. **Reporting Manager field**: Stored on the employee record only, no approval workflow routing is built around it (only Admin approves/rejects leave, per spec).

8. **Forgot punch-out**: If an employee forgets to punch out, that day's working hours/break are simply not calculated for that incomplete punch pair. No auto-correction or end-of-day auto punch-out is implemented.

9. **Leave-balance offset against absences (Payroll)**: Before deducting salary for absent/unpaid-leave/late-mark days, the system checks if the employee has unused paid leave balance (year-to-date) to cover it. If covered, an internal "Leave Adjustment" record is created so that balance is not reused again in a future month's payroll run.

10. **Multi-day leave day count**: Counted as calendar days inclusive (`toDate - fromDate + 1`), including weekends/holidays within the range. Not excluded.

11. **Salary slip PDF**: Generated on-demand (not pre-generated and stored) when the download endpoint is called, using pdfkit. No separate file storage/cloud upload implemented for slips.

## Known Limitations / Not Implemented
- Full monthly attendance calendar with color codes - implemented on frontend with simplified styling, not pixel-exact to spec mockup style.
- Employee self-service "change password" - not implemented.
- Leave application does not auto-split between paid and unpaid leave types if balance is insufficient - returns an error instead, asking employee to apply unpaid leave separately.
- Admin cannot edit/delete an already-approved or rejected leave request (no re-approval flow).

## API Documentation
See Postman collection in repo root: `HRMS.postman_collection.json`
