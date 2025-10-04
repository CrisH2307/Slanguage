#Backend

## Setup and test

`npm i
npm run dev`

### Open another terminal

`

curl -X POST http://localhost:4000/api/translate \
 -H "Content-Type: application/json" \
 -d '{"text":"mans got bare jokes no cap", "audience":"millennial","context":"chat","regionPref":"toronto"}'

curl -X POST http://localhost:4000/api/translate \ ─╯
-H "Content-Type: application/json" \
 -d '{"text":"I love hitler nazi", "audience":"millennial","context":"chat","regionPref":"toronto"}'

`
