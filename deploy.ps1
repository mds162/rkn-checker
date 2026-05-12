cd "d:\CLAUDE\РКН"
node ssh-run.mjs "cd /var/www/html && sudo -u nodejs git pull && sudo -u nodejs npm install && sudo -u nodejs npm run build && sudo -u nodejs pm2 restart rkn-checker && echo DEPLOY_DONE"
