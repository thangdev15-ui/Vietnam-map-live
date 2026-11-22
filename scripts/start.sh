#!/bin/bash
set -e
cd "$(dirname "$0")/.."
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
  nvm use 24
fi
node -e "if(Number(process.versions.node.split('.')[0])<24)throw Error('Cần Node.js 24 trở lên')"
if [ ! -d node_modules ]; then npm ci; fi
node -e "const fs=require('fs');if(!fs.existsSync('.env')){fs.writeFileSync('.env','HOST=127.0.0.1\nPORT=3001\nADMIN_TOKEN='+require('crypto').randomBytes(32).toString('hex')+'\nDATABASE_PATH=data/game.sqlite\nTIKTOK_SIGN_API_KEY=\n',{mode:0o600});console.log('Đã tạo .env với token ngẫu nhiên.');}"
npm run db:migrate
npm run dev
