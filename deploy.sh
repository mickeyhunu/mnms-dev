cd Documents/aws
ssh -i .\mmnsKey.pem ubuntu@43.202.61.53 --- cmd에서 우분투 접속


@pm2
pm2 start server.js --name midnightmens  --- pm2 실행
pm2 startup    --- 부팅시 자동 실행 등록
pm2 save

@nginx 설치
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx

sudo nano /etc/nginx/sites-available/midnightmens  --- nginx reverse proxy 설정

sudo ln -s /etc/nginx/sites-available/midnightmens /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx --- 적용
pm2 restart server


git fetch --all --prune
git pull --ff-only origin "main"
sudo nginx -t && sudo systemctl reload nginx --- 적용
pm2 restart server --- 재실행

git add .
git commit -m "Update"
git push origin main

git restore data/request_logs.jsonl
git pull --ff-only origin main

git fetch origin
git reset --hard origin/main