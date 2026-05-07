import dotenv from 'dotenv';
dotenv.config({ override: true });
console.log('--- ENV CHECK ---');
console.log('PORT:', process.env.PORT);
console.log('BACKEND_URL:', process.env.BACKEND_URL);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('-----------------');
