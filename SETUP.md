# GearTrack Setup Guide

## Prerequisites
- Docker Desktop (download from docker.com)
- .NET 8 SDK
- Node.js 20+

## Database Setup (All Members Must Do This)
1. Make sure Docker Desktop is running
2. Open terminal in project root folder
3. Run: docker-compose up -d
4. Wait 15 seconds
5. Run: cd backend
6. Run: dotnet ef database update
7. Run: dotnet run

## Frontend Setup
1. Open new terminal
2. Run: cd frontend
3. Run: npm install
4. Run: npm run dev

## Important
- Database password: GearTrack2026
- Database port: 5433
- Never change appsettings.json password
