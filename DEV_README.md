# Dev README

Developer notes for running, deploying, and extending RaaS.

## Project Structure

```text
api/
  core/
  models/
  routes/
  services/
raas-frontend/
  app/
start.sh
Dockerfile
docker-compose.yml
fly.toml
```

## Local Run

Add these to `.env`:

```env
OPENAI_API_KEY=your_key_here
ADMIN_PASSWORD=choose_a_password_you_will_use_for_admin_sign_in
ADMIN_SESSION_SECRET=generate_a_long_random_secret_for_cookie_signing
PROJECT_API_KEY_SECRET=set_a_stable_secret_for_shared_or_prod_use
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Start backend dependencies:

```bash
docker compose up -d
```

Run the frontend:

```bash
cd raas-frontend
npm install
npm run dev
```

Useful checks:

```bash
curl http://localhost:8000/health
```

## Local Combined Container

Build:

```bash
docker build -t raas-fly-check .
```

Run as one app with frontend and direct API access:

```bash
docker run --rm \
  -p 8080:8080 \
  -p 8000:8000 \
  --env-file .env \
  --name raas-fly-check-local \
  raas-fly-check
```

## Fly Deploy

Basic deploy flow for app `raas-sk`:

```bash
fly launch --name raas-sk --no-deploy
fly volumes create raas_data --region ewr --size 10 -a raas-sk

fly secrets set \
  OPENAI_API_KEY=your_key_here \
  ADMIN_PASSWORD=replace_with_a_single_admin_password \
  ADMIN_SESSION_SECRET=replace_with_a_stable_random_session_secret \
  PROJECT_API_KEY_SECRET=replace_with_your_project_api_key_secret \
  CORS_ALLOWED_ORIGINS=https://raas-sk.fly.dev \
  -a raas-sk

fly deploy
```

After deploy:

```text
https://raas-sk.fly.dev
https://raas-sk.fly.dev/api/health
```

If `fly.toml` still uses a different app name, change it before deploying.

## API Notes

Admin session routes:
- `POST /auth/login`
- `GET /auth/session`
- `POST /auth/logout`

Project routes:
- `POST /projects` requires admin session
- `DELETE /projects/{project_id}` requires admin session
- document, ingest, and query routes use the project API key

Quick API flow:

```bash
curl -s -c cookies.txt -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"<ADMIN_PASSWORD>"}'

curl -s -b cookies.txt -X POST http://localhost:8000/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"demo"}'

curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/documents \
  -H "Authorization: Bearer <API_KEY>" \
  -F "file=@./sample.pdf"

curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/ingest \
  -H "Authorization: Bearer <API_KEY>"

curl -s -X POST http://localhost:8000/projects/<PROJECT_ID>/query \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"query":"What does this document say?","top_k":5}'
```
