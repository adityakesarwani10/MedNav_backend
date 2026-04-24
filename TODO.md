# MongoDB Implementation TODO

- [x] 1. Add `mongoose` to `package.json`
- [x] 2. Create `models/` directory and schema files (User, Call, Ambulance, Hospital, Otp, Session)
- [x] 3. Update `db.js` with MongoDB connection + console logs + seed data
- [x] 4. Update `server.js` to start server after DB connects
- [x] 5. Update `middleware.js` to use async `User.findOne()`
- [x] 6. Update `routes/auth.js` to use Mongoose models
- [x] 7. Update `routes/userRoutes.js` to use Mongoose models
- [x] 8. Update `routes/adminRoutes.js` to use Mongoose models
- [x] 9. Update `routes/router.js` to use Mongoose models
- [x] 10. Update `api.js` to use Mongoose models
- [x] 11. Update `state.js` to use `Ambulance.findOneAndUpdate()`
- [x] 12. Run `npm install`

## Next Steps for User
1. Add `MONGODB_URI=your_mongodb_connection_string` to your `.env` file
2. Run `npm start` to start the server
3. Verify console shows: `✅ MongoDB Connected successfully` and `🚀 MedNav Server running cleanly on port 3000`

